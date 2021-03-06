#!/bin/bash
git clone https://github.com/eregs/regulations-core.git
cd regulations-core
pip install -r requirements.txt

python manage.py syncdb
python manage.py migrate
python manage.py runserver 8282 &
sleep 5 # give django enough time to startup

# Load the data
cd ../dummy_api
for TAIL in $(find */* -type f | sort -r)
do
    curl -X PUT http://localhost:8282/$TAIL -d @$TAIL
done

# Load a proposal
cd ..
git clone https://github.com/eregs/regulations-parser
cd regulations-parser
pip install -r requirements.txt
python eregs.py notice_preamble 2016-02749
python eregs.py layers
python eregs.py write_to http://localhost:8282
