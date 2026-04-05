from datetime import datetime
from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.models.goal import Goal
from .conftest import test_session_factory


class FrozenDateTime(datetime):
    frozen_now = datetime(2026, 3, 15, 12, 0, 0)

    @classmethod
    def utcnow(cls):
        return cls.frozen_now


def freeze_goal_time(value: datetime):
    FrozenDateTime.frozen_now = value
    return patch("app.routers.goals.datetime", FrozenDateTime)


async def set_goal_created_at(goal_id: str, created_at: datetime):
    async with test_session_factory() as session:
        goal = await session.scalar(select(Goal).where(Goal.id == goal_id))
        assert goal is not None
        goal.created_at = created_at
        goal.updated_at = created_at
        await session.commit()


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
        await set_goal_created_at(goal.json()["id"], datetime(2026, 1, 1, 0, 0, 0))

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
        assert [month["month"] for month in data[0]["months"]] == ["2026-02", "2026-01"]
        assert [month["spentAmount"] for month in data[0]["months"]] == [120, 90]
        assert [round(month["progressPercent"], 1) for month in data[0]["months"]] == [30.0, 22.5]


@pytest.mark.asyncio
async def test_expense_limit_history_starts_at_goal_creation_month(auth_client: AsyncClient):
    cats = await auth_client.get("/api/categories?type=expense")
    cat_id = cats.json()[0]["id"]

    acct = await auth_client.post("/api/accounts", json={
        "name": "Checking", "currency": "USD", "initialBalance": 5000,
    })
    acct_id = acct.json()["id"]

    await auth_client.post("/api/movements", json={
        "type": "expense",
        "amount": 80,
        "description": "Old expense",
        "date": datetime(2026, 2, 10, 12, 0, 0).isoformat(),
        "accountId": acct_id,
        "categoryId": cat_id,
    })

    with freeze_goal_time(datetime(2026, 3, 15, 12, 0, 0)):
        goal = await auth_client.post("/api/goals", json={
            "name": "Groceries Limit",
            "type": "expense_limit",
            "targetAmount": 300,
            "currency": "USD",
            "categoryId": cat_id,
        })
        assert goal.status_code == 201
        await set_goal_created_at(goal.json()["id"], datetime(2026, 3, 1, 0, 0, 0))

        await auth_client.post("/api/movements", json={
            "type": "expense",
            "amount": 50,
            "description": "Current expense",
            "date": datetime(2026, 3, 12, 12, 0, 0).isoformat(),
            "accountId": acct_id,
            "categoryId": cat_id,
        })

        res = await auth_client.get("/api/goals/expense-limit-history?months=12")
        assert res.status_code == 200
        data = res.json()
        assert data == []
