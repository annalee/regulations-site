from mock import Mock, patch
from django.conf import settings
from unittest import TestCase

from regulations.generator.layers.interpretations import InterpretationsLayer


class InterpretationsLayerTest(TestCase):
    def setUp(self):
        if not settings.configured:
            settings.configure(TEMPLATE_DEBUG=False, API_BASE='')

    @patch('regulations.generator.layers.interpretations.views'
           + '.partial_interp.PartialInterpView')
    def test_apply_layer_extra_fields(self, piv):
        layer = {
            "200-2-b-3-i": [{
                'reference': '200-2-b-3-i-Interp',
                "text": "Some contents are here"
            }],
        }
        piv.as_view.return_value.return_value.content = 'content'

        il = InterpretationsLayer(layer)

        self.assertEqual(il.apply_layer('200-2-b-3-i'), ('interp', {
            'for_markup_id': '200-2-b-3-i',
            'for_label': '2(b)(3)(i)',
            'interps': [{
                'label_id': '200-2-b-3-i-Interp',
                'markup': 'content',
                'section_id': '200-Interp'}]
        }))

    @patch('regulations.generator.layers.interpretations.views'
           + '.partial_interp.PartialInterpView')
    def test_apply_layer_section(self, piv):
        layer = {
            "200-2": [{
                "reference": "200-2-Interp",
                "text": "Some contents are here"
            }],
        }
        piv.as_view.return_value.return_value.content = 'content'
        il = InterpretationsLayer(layer)

        self.assertEqual('2', il.apply_layer('200-2')[1]['for_label'])

    @patch('regulations.generator.layers.interpretations.views'
           + '.partial_interp.PartialInterpView')
    def test_apply_layer_multiple_matches(self, piv):
        layer = {
            "200-2": [{
                "reference": "200-2-Interp",
                "text": "Some contents are here"
            }, {
                "reference": "200-2_3-Interp",
                "text": "Some more contents are here"
            }],
        }
        piv.as_view.return_value.return_value.content = 'content'
        il = InterpretationsLayer(layer)

        _, data = il.apply_layer('200-2')
        labels = [interp['label_id'] for interp in data['interps']]
        self.assertEqual(labels, ['200-2-Interp', '200-2_3-Interp'])

    @patch('regulations.generator.layers.interpretations.views'
           + '.partial_interp.PartialInterpView')
    def test_apply_layer_appendix(self, piv):
        layer = {
            "200-Q-5": [{
                "reference": "200-Q-5-Interp",
                "text": "Some contents are here"
            }],
        }
        piv.as_view.return_value.return_value.content = 'content'
        il = InterpretationsLayer(layer)

        self.assertEqual('Appendix Q-5',
                         il.apply_layer('200-Q-5')[1]['for_label'])

    @patch('regulations.generator.layers.interpretations.views'
           + '.partial_interp.PartialInterpView')
    def test_apply_layer_section_different(self, piv):
        layer = {
            "200-2-a": [{
                "reference": "200-2-a-Interp",
                "text": "Some contents are here"
            }],
            "200-2-b": [{
                "reference": "200-2-a-Interp",
                "text": "Some contents are here"
            }],
        }
        piv.as_view.return_value.return_value.content = 'content'
        il = InterpretationsLayer(layer)

        _, result = il.apply_layer('200-2-a')
        self.assertEqual('2(a)', result['for_label'])

        _, result = il.apply_layer('200-2-b')
        self.assertEqual('2(b)', result['for_label'])

    @patch('regulations.generator.layers.interpretations.views')
    def test_determine_section_id(self, views):
        il = InterpretationsLayer(None)
        #   No version set
        for label in (['200', '2', 'Interp'], ['200', 'Interp'],
                      ['200', 'Subpart', 'Interp']):
            self.assertEqual('200-Interp', il.determine_section_id(label))
        il.version = 'vvvvv'
        self.assertEqual('200-Interp',
                         il.determine_section_id(['200', 'Interp']))

        views.utils.table_of_contents.return_value = []
        self.assertEqual('200-Interp',
                         il.determine_section_id(['200', 'Interp']))

        views.utils.table_of_contents.return_value = [
            {'index': ['200', '1'], 'is_section': True},
            {'index': ['200', '2'], 'is_section': True},
            {'index': ['200', 'A'], 'is_appendix': True}]
        self.assertEqual('200-Subpart-Interp',
                         il.determine_section_id(['200', '1', 'Interp']))
        self.assertEqual('200-Subpart-Interp',
                         il.determine_section_id(['200', '2', 'Interp']))
        self.assertEqual('200-Appendices-Interp',
                         il.determine_section_id(['200', 'A', 'Interp']))
        self.assertEqual('200-Interp',
                         il.determine_section_id(['200', '3', 'Interp']))

        il = InterpretationsLayer(None, 'vvv')
        views.utils.table_of_contents.return_value = [
            {'index': ['200', 'Subpart', 'A'],
             'sub_toc': [
                {'index': ['200', '1'], 'is_section': True},
                {'index': ['200', '2'], 'is_section': True}]},
            {'index': ['200', 'A'], 'is_appendix': True}]
        self.assertEqual('200-Subpart-A-Interp',
                         il.determine_section_id(['200', '1', 'Interp']))
        self.assertEqual('200-Subpart-A-Interp',
                         il.determine_section_id(['200', '2', 'Interp']))
        self.assertEqual('200-Appendices-Interp',
                         il.determine_section_id(['200', 'A', 'Interp']))
