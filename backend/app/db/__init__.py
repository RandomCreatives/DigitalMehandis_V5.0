# DB package — import both model modules so SQLAlchemy resolves all relationships
from app.db import models  # noqa: F401
from app.db import models_phase2  # noqa: F401
