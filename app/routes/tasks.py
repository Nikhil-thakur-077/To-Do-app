from flask import Blueprint, flash, redirect, render_template, request, session, url_for

from app.user_db import Task, get_user_task_session

tasks_bp = Blueprint("tasks", __name__)


def _require_user_session():
    if "user" not in session or "user_id" not in session:
        return None
    return get_user_task_session()


@tasks_bp.route("/tasks")
def view_tasks():
    db_session = _require_user_session()
    if db_session is None:
        return redirect(url_for("auth.index"))

    tasks = db_session.query(Task).all()
    return render_template("tasks.html", tasks=tasks)


@tasks_bp.route("/add", methods=["GET", "POST"])
def add_tasks():
    db_session = _require_user_session()
    if db_session is None:
        return redirect(url_for("auth.index"))

    title = request.form.get("title")
    if title:
        new_task = Task(title=title, status="Pending")
        db_session.add(new_task)
        db_session.commit()
        flash("Task added successfully", "success")
    return redirect(url_for("tasks.view_tasks"))


@tasks_bp.route("/toggle/<int:task_id>", methods=["POST"])
def toggle_status(task_id):
    db_session = _require_user_session()
    if db_session is None:
        return redirect(url_for("auth.index"))

    task = db_session.get(Task, task_id)
    if task:
        if task.status == "Pending":
            task.status = "Working"
        elif task.status == "Working":
            task.status = "done"
        else:
            task.status = "Pending"
        db_session.commit()
        flash("Task status updated ", "info")
    return redirect(url_for("tasks.view_tasks"))


@tasks_bp.route("/clear", methods=["POST"])
def clear_tasks():
    db_session = _require_user_session()
    if db_session is None:
        return redirect(url_for("auth.index"))

    db_session.query(Task).delete()
    db_session.commit()
    flash("All tasks cleared ", "info")
    return redirect(url_for("tasks.view_tasks"))


@tasks_bp.route("/clear_one_task/<int:task_id>", methods=["POST"])
def clear_one_task(task_id):
    db_session = _require_user_session()
    if db_session is None:
        return redirect(url_for("auth.index"))

    task = db_session.get(Task, task_id)
    if task:
        db_session.delete(task)
        db_session.commit()
        flash("Task deleted ", "info")
    else:
        flash("Task not found ", "danger")
    return redirect(url_for("tasks.view_tasks"))
