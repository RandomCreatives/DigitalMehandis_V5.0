import importlib
import pkgutil
from fastapi import FastAPI, APIRouter
from loguru import logger


def load_modules(app: FastAPI, modules_package: str, prefix: str = "/api/v1"):
    """
    Dynamically discover and register modules from the specified package.
    Expects each module to have a 'router' attribute in its __init__.py or a router.py.
    """
    package = importlib.import_module(modules_package)
    for loader, module_name, is_pkg in pkgutil.walk_packages(package.__path__, package.__name__ + "."):
        # We only care about top-level modules in the package
        if module_name.count('.') > 3: # app.modules.name.sub
             continue

        try:
            mod = importlib.import_module(module_name)
            # Try to find a router in the module
            router = getattr(mod, "router", None)

            # If not in __init__, try mod.router (e.g. app.modules.auth.router)
            if not router and hasattr(mod, "router"):
                router = mod.router

            if isinstance(router, APIRouter):
                app.include_router(router, prefix=prefix)
                logger.info(f"Successfully loaded module: {module_name}")
        except Exception as e:
            logger.error(f"Failed to load module {module_name}: {e}")
