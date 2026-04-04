from datetime import datetime
from unittest.mock import patch

import pytest
from httpx import AsyncClient


class FrozenDateTime(datetime):
    frozen_now = datetime(2026, 3, 15, 12, 0, 0)

    @classmethod
    def utcnow(cls):
        return cls.frozen_now


def freeze_goal_time(value: datetime):
    FrozenDateTime.frozen_now = value
    return patch("app.routers.goals.datetime", FrozenDateTime)


@pytest.mark.asyncio
async def test_expense_limit_history_returns_monthly_consumption(auth_client: AsyncClient):
    cats = await auth_client.get("/api/categories?type=expense")
    cat_id = cats.json()[0]["id"]

    acct = await auth_client.post("/api/accounts", json={
        "name": "Checking", "currency": "USD", "initialBalance": 5000,
    })
    acct_id = acct.json()["id"]

    with freeze_goal_time(datetime(2026, 3, 15, 12, 0, 0)):
        goal = await auth_client.post("/api/goals", json={
            "name": "Dining Out Limit",
            "type": "expense_limit",
            "targetAmount": 400,
            "currency": "USD",
            "categoryId": cat_id,
        })
        assert goal.status_code == 201

        for amount, movement_date in [
            (90, datetime(2026, 1, 5, 12, 0, 0)),
            (120, datetime(2026, 2, 5, 12, 0, 0)),
            (60, datetime(2026, 3, 8, 12, 0, 0)),
        ]:
            await auth_client.post("/api/movements", json={
                "type": "expense",
                "amount": amount,
                "description": f"Expense {movement_date.month}",
                "date": movement_date.isoformat(),
                "accountId": acct_id,
                "categoryId": cat_id,
            })

        res = await auth_client.get("/api/goals/expense-limit-history?months=3")
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 1
        assert data[0]["goalName"] == "Dining Out Limit"
        assert [month["month"] for month in data[0]["months"]] == ["2026-01", "2026-02", "2026-03"]
        assert [month["spentAmount"] for month in data[0]["months"]] == [90, 120, 60]
        assert [round(month["progressPercent"], 1) for month in data[0]["months"]] == [22.5, 30.0, 15.0]
