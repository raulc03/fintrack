from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://fintrack:fintrack@localhost:5432/fintrack"
    jwt_secret: str = "dev-secret-change-in-prod"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 1 week
    dev_seed: bool = False
    dev_seed_email: str = "localtest@example.com"
    dev_seed_password: str = "test123456"
    dev_seed_name: str = "Local Test User"
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
    ]

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
