import os

# Flask
SECRET_KEY = 'abcdefghijklmnopqrstuvwxyz'

# SQLAlchymy
current_path = os.path.dirname(os.path.realpath(__file__))
data_name = 'app.db'
SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(current_path, data_name)
SQLALCHEMY_TRACK_MODIFICATIONS = False
