from flask import (Flask, flash, jsonify, redirect, render_template, request,
                   url_for, session)
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)
app.config.from_pyfile('config.py')
db = SQLAlchemy(app)


@app.route('/')
def index():
    if session.get('username', None) is None:
        return redirect(url_for('login'))
    username = session['username']
    user = User.query.filter_by(username=username).first()
    if not user.api_key:
        # Force user to add key before process
        return redirect(url_for('update_key'))
    return render_template('index.html')


@app.route('/register', methods=('GET', 'POST'))
def register():
    if request.method == 'POST':
        username = request.form.get('username', None)
        password = request.form.get('password', None)
        error_message = None

        if not username or not password:
            error_message = 'Please fill in all fields.'
        elif len(username) < 3:
            error_message = 'Username must be at least 3 characters.'
        elif len(password) < 8:
            error_message = 'Password must be at lesat 8 characters.'
        elif User.query.filter_by(username=username).first() is not None:
            error_message = 'Username is existed.'
        else:
            user = User(username=username, password=password)
            db.session.add(user)
            db.session.commit()
            flash('Registeration is succesful.')
            return redirect(url_for('login'))

        flash(error_message)

    if session['username']:
        return redirect(url_for('index'))
    return render_template('register.html')


@app.route('/login', methods=('GET', 'POST'))
def login():
    if request.method == 'POST':
        username = request.form.get('username', None)
        password = request.form.get('password', None)
        error_message = None
        user = User.query.filter_by(username=username).first()

        if not username or not password:
            error_message = 'Please fill in all fields.'
        elif not user:
            error_message = 'Username is not existed.'
        elif not user.check_password(password):
            error_message = 'Password incorrect.'
        else:
            session.clear()
            session['username'] = username
            return redirect(url_for('index'))

        flash(error_message)

    if session.get('username', None):
        return redirect(url_for('index'))
    return render_template('login.html')


@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))


@app.route('/update-key', methods=('GET', 'POST',))
def update_key():
    if request.method == 'POST':
        api_key = request.form.get('key', None)
        username = session['username']
        user = User.query.filter_by(username=username)
        if api_key:
            user.api_key = api_key
            db.session.commit()
            return redirect(url_for('index'))
        flash('API Key cannot be empty.')
    return render_template(url_for('update_key.html'))


class User(db.Model):
    username = db.Column(db.String(32), primary_key=True)
    password = db.Column(db.String, nullable=False)
    api_key = db.Column(db.String)

    def __init__(self, username, password, **kwargs):
        db.Model.__init__(self, username=username, **kwargs)
        self.password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password, password)
