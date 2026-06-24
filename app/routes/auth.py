from flask import Blueprint, flash, redirect, render_template, request, session, url_for

from app import db
from app.models import user as User
from app.user_db import init_user_database

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        found_user = User.query.filter_by(username=username).first()
        if found_user and found_user.password == password:
            session["user"] = username
            session["user_id"] = found_user.id
            init_user_database(found_user.id)
            flash("Login successful", "success")
            return redirect(url_for("tasks.view_tasks"))
    return render_template("login.html")


@auth_bp.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            flash("Username already exists", "danger")
            return redirect(url_for("auth.register"))
        new_user = User(username=username, password=password)
        db.session.add(new_user)
        db.session.commit()
        init_user_database(new_user.id)
        flash("Registration successful", "success")
        return redirect(url_for("auth.login"))
    return render_template("register.html")


@auth_bp.route("/logout")
def logout():
    session.pop("user", None)
    session.pop("user_id", None)
    flash("Logged out", "info")
    return redirect(url_for("auth.login"))
