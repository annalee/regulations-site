import os.path
import json
import time
import logging

import celery
import requests
from django.conf import settings
from django.core.cache import caches
from django.http import JsonResponse
from django.utils.crypto import get_random_string
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt

from regulations import docket
from regulations import tasks

logger = logging.getLogger(__name__)

# TODO: Expire preview URL at commenting deadline
PREVIEW_EXPIRATION_SECONDS = 60 * 60 * 24 * 90


def upload_proxy(request):
    """Create a random key name and a pair of temporary PUT and GET URLS to
    permit attachment uploads and previews from the browser.
    """
    filename = request.GET['name']
    size = int(request.GET['size'])
    valid, message = validate_attachment(filename, size)
    if not valid:
        logger.error(message)
        return JsonResponse({'message': message}, status=400)
    s3 = tasks.make_s3_client()
    key = get_random_string(50)
    put_url = s3.generate_presigned_url(
        ClientMethod='put_object',
        Params={
            'ContentLength': size,
            'ContentType': request.GET.get('type', 'application/octet-stream'),
            'Bucket': settings.ATTACHMENT_BUCKET,
            'Key': key,
            'Metadata': {'name': filename}
        },

    )
    disposition = 'attachment; filename="{}"'.format(filename)
    get_url = s3.generate_presigned_url(
        ClientMethod='get_object',
        Params={
            'ResponseExpires': time.time() + PREVIEW_EXPIRATION_SECONDS,
            'ResponseContentDisposition': disposition,
            'Bucket': settings.ATTACHMENT_BUCKET,
            'Key': key,
        },
    )
    return JsonResponse({
        'urls': {'get': get_url, 'put': put_url},
        'key': key,
    })


@csrf_exempt
@require_http_methods(['POST'])
def preview_comment(request):
    """Convert a comment to PDF, upload the result to S3, and return a signed
    URL to GET the PDF.
    """
    body = json.loads(request.body.decode('utf-8'))
    html = tasks.json_to_html(body)
    key = '/'.join([settings.ATTACHMENT_PREVIEW_PREFIX, get_random_string(50)])
    s3 = tasks.make_s3_client()
    with tasks.html_to_pdf(html) as pdf:
        s3.put_object(
            Body=pdf,
            ContentType='application/pdf',
            ContentDisposition='attachment; filename="comment.pdf"',
            Bucket=settings.ATTACHMENT_BUCKET,
            Key=key,
        )
    url = s3.generate_presigned_url(
        ClientMethod='get_object',
        Params={
            'Bucket': settings.ATTACHMENT_BUCKET,
            'Key': key,
        },
    )
    return JsonResponse({'url': url})


@csrf_exempt
@require_http_methods(['POST'])
def submit_comment(request):
    """Submit a comment to the task queue.
       The request body is JSON with a 'comment' field and additional fields.
    """
    body = json.loads(request.body.decode('utf-8'))
    valid, message = docket.sanitize_fields(body)
    if not valid:
        logger.error(message)
        return JsonResponse({'message': message}, status=403)

    files = extract_files(body)
    # Account for the main comment itself submitted as an attachment
    if len(files) > settings.MAX_ATTACHMENT_COUNT - 1:
        message = "Too many attachments"
        logger.error(message)
        return JsonResponse({'message': message}, status=403)

    s3 = tasks.make_s3_client()
    metadata_key = get_random_string(50)
    metadata_url = s3.generate_presigned_url(
        ClientMethod='get_object',
        Params={
            'Bucket': settings.ATTACHMENT_BUCKET,
            'Key': metadata_key,
        },
    )
    chain = celery.chain(
        tasks.submit_comment.s(body, files),
        tasks.publish_metadata.s(key=metadata_key),
    )
    chain.delay()
    return JsonResponse({
        'status': 'submitted',
        'metadata_url': metadata_url,
    })


@require_http_methods(['GET', 'HEAD'])
def get_federal_agencies(request):
    return lookup_regulations_gov(field='gov_agency',
                                  dependentOnValue='Federal')


@require_http_methods(['GET', 'HEAD'])
def get_gov_agency_types(request):
    return lookup_regulations_gov(field='gov_agency_type')


def lookup_regulations_gov(*args, **kwargs):
    """ GET lookup values from regulations.gov. Use a cache """
    cache = caches['regs_gov_cache']
    cache_key = make_cache_key(**kwargs)
    response = cache.get(cache_key)

    if response is None:
        logger.debug("Looking up in regs.gov")
        response = requests.get(
            settings.REGS_GOV_API_LOOKUP_URL,
            params=kwargs,
            headers={'X-Api-Key': settings.REGS_GOV_API_KEY}
        )
        if response.status_code == requests.codes.ok:
            response = JsonResponse(response.json()['list'], safe=False)
            cache.set(cache_key, response)
        else:
            logger.error("Failed to lookup regulations.gov: {}",
                         response.status_code, response.text)
            response.raise_for_status()
    return response


def validate_attachment(filename, size):
    if size <= 0 or size > settings.ATTACHMENT_MAX_SIZE:
        return False, "Invalid attachment size"
    _, ext = os.path.splitext(filename)
    if ext[1:].lower() not in settings.VALID_ATTACHMENT_EXTENSIONS:
        return False, "Invalid attachment type"
    return True, ""


def extract_files(body):
    '''
    Extracts the files that are to be attached to the comment.
    Returns a collection of dicts where for each dict:
        - dict['key'] specifies the file to be attached from S3
        - dict['name'] specifies the name under which the file is to be
          attached.
    '''
    return [
        file
        for section in body.get('sections', [])
        for file in section.get('files', [])
    ]


def make_cache_key(*args, **kwargs):
    """ Make a cache key of the form key1:value1:key2:value2.
        Sort the keys to ensure repeatability
    """
    return ":".join((key + ":" + str(kwargs[key]) for key in sorted(kwargs)))
