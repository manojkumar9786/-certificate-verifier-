from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import bootstrap, config
from .errors import ApiError
from .routers import admin, auth, certificates


@asynccontextmanager
async def lifespan(_app: FastAPI):
    bootstrap.run()  # tables, schema upgrades, admin account
    yield


app = FastAPI(
    title="Certificate Verifier API",
    lifespan=lifespan,
    docs_url=None if config.IS_PROD else "/docs",
    redoc_url=None,
    openapi_url=None if config.IS_PROD else "/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CLIENT_URLS,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.exception_handler(ApiError)
async def api_error_handler(_req: Request, exc: ApiError):
    return JSONResponse({"error": exc.message, **exc.extra}, status_code=exc.status)


@app.exception_handler(RequestValidationError)
async def validation_handler(_req: Request, _exc: RequestValidationError):
    return JSONResponse({"error": "Invalid request"}, status_code=400)


@app.get("/health")
def health():
    return {"ok": True}


app.include_router(auth.router)
app.include_router(certificates.router)
app.include_router(admin.router)
