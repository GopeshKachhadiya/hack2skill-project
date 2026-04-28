import app.main
for route in app.main.app.routes:
    print(getattr(route, "path", route))