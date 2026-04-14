import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_settings_include_timezone(auth_client: AsyncClient):
    response = await auth_client.get("/api/settings")

    assert response.status_code == 200
    assert response.json() == {
        "mainCurrency": "PEN",
        "usdToPenRate": 3.7,
        "timezone": "America/Lima",
    }


@pytest.mark.asyncio
async def test_settings_timezone_can_be_updated(auth_client: AsyncClient):
    response = await auth_client.patch("/api/settings", json={"timezone": "America/New_York"})

    assert response.status_code == 200
    assert response.json()["timezone"] == "America/New_York"
