from datetime import datetime
from unittest.mock import patch

import pytest
from httpx import AsyncClient


class FrozenDateTime(datetime):
    frozen_now = datetime(2026, 1, 15, 12, 0, 0)

    @classmethod
    def utcnow(cls):
        return cls.frozen_now


def freeze_obligation_time(value: datetime):
    FrozenDateTime.frozen_now = value
    return patch("app.routers.obligations.datetime", FrozenDateTime)


@pytest.mark.asyncio
async def test_create_obligation(auth_client: AsyncClient):
    cats = await auth_client.get("/api/categories?type=expense")
    cat_id = cats.json()[0]["id"]

    res = await auth_client.post("/api/obligations", json={
        "name": "Rent",
        "categoryId": cat_id,
        "estimatedAmount": 1200,
        "currency": "USD",
        "dueDay": 1,
    })
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Rent"
    assert data["estimatedAmount"] == 1200
    assert data["dueDay"] == 1
    assert data["currency"] == "USD"
    assert data["isActive"] is True
    assert data["isPaid"] is False  # no auto-detection, starts unpaid


@pytest.mark.asyncio
async def test_list_obligations_sorted_by_due_day(auth_client: AsyncClient):
    cats = await auth_client.get("/api/categories?type=expense")
    cat_id = cats.json()[0]["id"]

    await auth_client.post("/api/obligations", json={
        "name": "Insurance", "categoryId": cat_id, "estimatedAmount": 400, "currency": "USD", "dueDay": 25,
    })
    await auth_client.post("/api/obligations", json={
        "name": "Rent", "categoryId": cat_id, "estimatedAmount": 1200, "currency": "USD", "dueDay": 1,
    })
    await auth_client.post("/api/obligations", json={
        "name": "Internet", "categoryId": cat_id, "estimatedAmount": 50, "currency": "USD", "dueDay": 5,
    })

    res = await auth_client.get("/api/obligations")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 3
    assert data[0]["dueDay"] == 1
    assert data[1]["dueDay"] == 5
    assert data[2]["dueDay"] == 25


@pytest.mark.asyncio
async def test_obligation_starts_unpaid(auth_client: AsyncClient):
    """New obligations should always start as unpaid — no auto-detection."""
    cats = await auth_client.get("/api/categories?type=expense")
    cat_id = cats.json()[0]["id"]

    # Create an expense movement
    acct = await auth_client.post("/api/accounts", json={
        "name": "Checking", "currency": "USD", "initialBalance": 5000,
    })
    acct_id = acct.json()["id"]

    await auth_client.post("/api/movements", json={
        "type": "expense", "amount": 1200, "description": "Rent payment",
        "date": datetime.utcnow().isoformat(), "accountId": acct_id, "categoryId": cat_id,
    })

    # Create obligation with matching category and amount — should still be unpaid
    res = await auth_client.post("/api/obligations", json={
        "name": "Rent", "categoryId": cat_id, "estimatedAmount": 1200, "currency": "USD", "dueDay": 1,
    })
    assert res.json()["isPaid"] is False
    assert res.json()["linkedMovementId"] is None


@pytest.mark.asyncio
async def test_summary(auth_client: AsyncClient):
    cats = await auth_client.get("/api/categories?type=expense")
    cat_id = cats.json()[0]["id"]

    acct = await auth_client.post("/api/accounts", json={
        "name": "Checking", "currency": "USD", "initialBalance": 5000,
    })
    acct_id = acct.json()["id"]

    ob1 = await auth_client.post("/api/obligations", json={
        "name": "Rent", "categoryId": cat_id, "estimatedAmount": 1200, "currency": "USD", "dueDay": 1,
    })
    ob1_id = ob1.json()["id"]

    await auth_client.post("/api/obligations", json={
        "name": "Netflix", "categoryId": cat_id, "estimatedAmount": 15, "currency": "USD", "dueDay": 25,
    })

    mov = await auth_client.post("/api/movements", json={
        "type": "expense", "amount": 1200, "description": "Rent payment",
        "date": datetime.utcnow().isoformat(), "accountId": acct_id, "categoryId": cat_id,
    })
    mov_id = mov.json()["id"]

    await auth_client.patch(f"/api/obligations/{ob1_id}/link", json={"movementId": mov_id})

    res = await auth_client.get("/api/obligations/summary")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1
    summary = data[0]
    assert summary["currency"] == "USD"
    assert summary["totalObligations"] == 1215
    assert summary["paidAmount"] == 1200
    assert summary["pendingAmount"] == 15
    assert summary["coveragePercent"] > 95


@pytest.mark.asyncio
async def test_manual_link(auth_client: AsyncClient):
    cats = await auth_client.get("/api/categories?type=expense")
    cat_id = cats.json()[0]["id"]

    acct = await auth_client.post("/api/accounts", json={
        "name": "Checking", "currency": "USD", "initialBalance": 5000,
    })
    acct_id = acct.json()["id"]

    mov = await auth_client.post("/api/movements", json={
        "type": "expense", "amount": 50, "description": "Internet",
        "date": datetime.utcnow().isoformat(), "accountId": acct_id, "categoryId": cat_id,
    })
    mov_id = mov.json()["id"]

    ob = await auth_client.post("/api/obligations", json={
        "name": "Internet", "categoryId": cat_id, "estimatedAmount": 50, "currency": "USD", "dueDay": 5,
    })
    ob_id = ob.json()["id"]
    assert ob.json()["isPaid"] is False

    # Manually link
    res = await auth_client.patch(f"/api/obligations/{ob_id}/link", json={"movementId": mov_id})
    assert res.status_code == 200
    assert res.json()["isPaid"] is True
    assert res.json()["linkedMovementId"] == mov_id


@pytest.mark.asyncio
async def test_delete_obligation(auth_client: AsyncClient):
    cats = await auth_client.get("/api/categories?type=expense")
    cat_id = cats.json()[0]["id"]

    ob = await auth_client.post("/api/obligations", json={
        "name": "Test", "categoryId": cat_id, "estimatedAmount": 100, "currency": "USD", "dueDay": 10,
    })
    ob_id = ob.json()["id"]

    res = await auth_client.delete(f"/api/obligations/{ob_id}")
    assert res.status_code == 204

    all_obs = await auth_client.get("/api/obligations")
    assert len(all_obs.json()) == 0


@pytest.mark.asyncio
async def test_update_obligation(auth_client: AsyncClient):
    cats = await auth_client.get("/api/categories?type=expense")
    cat_id = cats.json()[0]["id"]

    ob = await auth_client.post("/api/obligations", json={
        "name": "Rent", "categoryId": cat_id, "estimatedAmount": 1200, "currency": "USD", "dueDay": 1,
    })
    ob_id = ob.json()["id"]

    res = await auth_client.patch(f"/api/obligations/{ob_id}", json={
        "name": "Rent + Parking",
        "estimatedAmount": 1300,
    })
    assert res.status_code == 200
    assert res.json()["name"] == "Rent + Parking"
    assert res.json()["estimatedAmount"] == 1300


@pytest.mark.asyncio
async def test_link_and_unlink_obligation(auth_client: AsyncClient):
    cats = await auth_client.get("/api/categories?type=expense")
    cat_id = cats.json()[0]["id"]

    acct = await auth_client.post("/api/accounts", json={
        "name": "Checking", "currency": "USD", "initialBalance": 5000,
    })
    acct_id = acct.json()["id"]

    ob = await auth_client.post("/api/obligations", json={
        "name": "Netflix", "categoryId": cat_id, "estimatedAmount": 15, "currency": "USD", "dueDay": 25,
    })
    ob_id = ob.json()["id"]
    assert ob.json()["isPaid"] is False

    mov = await auth_client.post("/api/movements", json={
        "type": "expense", "amount": 15, "description": "Netflix payment",
        "date": datetime.utcnow().isoformat(), "accountId": acct_id, "categoryId": cat_id,
    })
    mov_id = mov.json()["id"]

    res = await auth_client.patch(f"/api/obligations/{ob_id}/link", json={"movementId": mov_id})
    assert res.status_code == 200
    assert res.json()["isPaid"] is True
    assert res.json()["linkedMovementId"] == mov_id

    res = await auth_client.patch(f"/api/obligations/{ob_id}/link", json={"movementId": None})
    assert res.status_code == 200
    assert res.json()["isPaid"] is False
    assert res.json()["linkedMovementId"] is None


@pytest.mark.asyncio
async def test_link_updates_summary(auth_client: AsyncClient):
    cats = await auth_client.get("/api/categories?type=expense")
    cat_id = cats.json()[0]["id"]

    acct = await auth_client.post("/api/accounts", json={
        "name": "Checking", "currency": "USD", "initialBalance": 5000,
    })
    acct_id = acct.json()["id"]

    ob = await auth_client.post("/api/obligations", json={
        "name": "Netflix", "categoryId": cat_id, "estimatedAmount": 15, "currency": "USD", "dueDay": 25,
    })
    ob_id = ob.json()["id"]

    # Before toggle: should be pending
    summary = await auth_client.get("/api/obligations/summary")
    assert summary.json()[0]["pendingAmount"] == 15

    mov = await auth_client.post("/api/movements", json={
        "type": "expense", "amount": 15, "description": "Netflix payment",
        "date": datetime.utcnow().isoformat(), "accountId": acct_id, "categoryId": cat_id,
    })
    mov_id = mov.json()["id"]

    await auth_client.patch(f"/api/obligations/{ob_id}/link", json={"movementId": mov_id})

    # After linking: should be paid
    summary = await auth_client.get("/api/obligations/summary")
    assert summary.json()[0]["paidAmount"] == 15
    assert summary.json()[0]["pendingAmount"] == 0


@pytest.mark.asyncio
async def test_paid_obligation_resets_when_month_changes(auth_client: AsyncClient):
    cats = await auth_client.get("/api/categories?type=expense")
    cat_id = cats.json()[0]["id"]

    acct = await auth_client.post("/api/accounts", json={
        "name": "Checking", "currency": "USD", "initialBalance": 5000,
    })
    acct_id = acct.json()["id"]

    with freeze_obligation_time(datetime(2026, 1, 15, 12, 0, 0)):
        ob = await auth_client.post("/api/obligations", json={
            "name": "Rent", "categoryId": cat_id, "estimatedAmount": 1200, "currency": "USD", "dueDay": 1,
        })
        ob_id = ob.json()["id"]

        mov = await auth_client.post("/api/movements", json={
            "type": "expense", "amount": 1200, "description": "Rent payment",
            "date": datetime(2026, 1, 20, 9, 0, 0).isoformat(), "accountId": acct_id, "categoryId": cat_id,
        })
        await auth_client.patch(f"/api/obligations/{ob_id}/link", json={"movementId": mov.json()["id"]})

    with freeze_obligation_time(datetime(2026, 2, 2, 12, 0, 0)):
        res = await auth_client.get("/api/obligations")
        assert res.status_code == 200
        data = res.json()[0]
        assert data["isPaid"] is False
        assert data["linkedMovementId"] is None
        assert data["estimatedAmount"] == 1200
        assert data["carryoverAmount"] == 0

        summary = await auth_client.get("/api/obligations/summary")
        assert summary.json()[0]["paidAmount"] == 0
        assert summary.json()[0]["pendingAmount"] == 1200


@pytest.mark.asyncio
async def test_unpaid_obligation_carries_over_into_new_month(auth_client: AsyncClient):
    cats = await auth_client.get("/api/categories?type=expense")
    cat_id = cats.json()[0]["id"]

    with freeze_obligation_time(datetime(2026, 1, 15, 12, 0, 0)):
        await auth_client.post("/api/obligations", json={
            "name": "Rent", "categoryId": cat_id, "estimatedAmount": 1200, "currency": "USD", "dueDay": 1,
        })

    with freeze_obligation_time(datetime(2026, 2, 2, 12, 0, 0)):
        res = await auth_client.get("/api/obligations")
        assert res.status_code == 200
        data = res.json()[0]
        assert data["isPaid"] is False
        assert data["baseAmount"] == 1200
        assert data["carryoverAmount"] == 1200
        assert data["estimatedAmount"] == 2400

        summary = await auth_client.get("/api/obligations/summary")
        assert summary.json()[0]["totalObligations"] == 2400
        assert summary.json()[0]["pendingAmount"] == 2400


@pytest.mark.asyncio
async def test_cannot_link_previous_month_movement(auth_client: AsyncClient):
    cats = await auth_client.get("/api/categories?type=expense")
    cat_id = cats.json()[0]["id"]

    acct = await auth_client.post("/api/accounts", json={
        "name": "Checking", "currency": "USD", "initialBalance": 5000,
    })
    acct_id = acct.json()["id"]

    with freeze_obligation_time(datetime(2026, 2, 2, 12, 0, 0)):
        ob = await auth_client.post("/api/obligations", json={
            "name": "Rent", "categoryId": cat_id, "estimatedAmount": 1200, "currency": "USD", "dueDay": 1,
        })
        ob_id = ob.json()["id"]

        mov = await auth_client.post("/api/movements", json={
            "type": "expense", "amount": 1200, "description": "Old rent payment",
            "date": datetime(2026, 1, 31, 9, 0, 0).isoformat(), "accountId": acct_id, "categoryId": cat_id,
        })

        res = await auth_client.patch(f"/api/obligations/{ob_id}/link", json={"movementId": mov.json()["id"]})
        assert res.status_code == 400
        assert res.json()["detail"] == "Only current-month movements can be linked to an obligation"
