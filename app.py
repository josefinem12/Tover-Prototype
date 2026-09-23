import os
from pathlib import Path

from flask import Flask, send_from_directory

BASE_DIR = Path(__file__).resolve().parent

# The dashboard is a static SPA (index.html + styles.css + js/**), so Flask's
# job here is just to serve those files. static_url_path='' maps the static
# folder straight onto the site root, so every relative path already inside
# index.html (styles.css, js/app.js, ...) keeps working unchanged.
app = Flask(__name__, static_folder=str(BASE_DIR), static_url_path="")


@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
