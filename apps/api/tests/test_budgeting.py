import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_signup_seeds_bucketed_default_categories(auth_client: AsyncClient):
    response = await auth_client.get("/api/categories?type=expense")

    assert response.status_code == 200
    categories = {item["name"]: item for item in response.json()}
    assert categories["Rent"]["bucket"] == "necessity"
    assert categories["Entertainment"]["bucket"] == "desire"
    assert categories["Transfer"]["bucket"] == "save_invest"


@pytest.mark.asyncio
async def test_budget_summary_rolls_up_category_buckets_and_goal_allocations(
    auth_client: AsyncClient,
):
    categories_response = await auth_client.get("/api/categories")
    categories = {item["name"]: item["id"] for item in categories_response.json()}

    await auth_client.post(
        "/api/movements",
        json={
            "type": "income",
            "amount": 1000,
            "description": "Salary",
            "date": "2026-04-10T12:00:00",
            "accountId": (
                await auth_client.post(
                    "/api/accounts",
                    json={
                        "name": "Main PEN",
                        "currency": "PEN",
                        "initialBalance": 0,
                        "color": "#10b981",
                    },
                )
            ).json()["id"],
            "categoryId": categories["Salary"],
        },
    )

    accounts = await auth_client.get("/api/accounts")
    account_id = accounts.json()[0]["id"]

    necessity = await auth_client.post(
        "/api/movements",
        json={
            "type": "expense",
            "amount": 400,
            "description": "Rent",
            "date": "2026-04-11T12:00:00",
            "accountId": account_id,
            "categoryId": categories["Rent"],
        },
    )
    assert necessity.status_code == 201

    desire = await auth_client.post(
        "/api/movements",
        json={
            "type": "expense",
            "amount": 150,
            "description": "Fun",
            "date": "2026-04-12T12:00:00",
            "accountId": account_id,
            "categoryId": categories["Entertainment"],
        },
    )
    assert desire.status_code == 201

    custom_category = await auth_client.post(
        "/api/categories",
        json={
            "name": "Mystery",
            "type": "expense",
            "icon": "tag",
            "color": "#64748b",
        },
    )
    assert custom_category.status_code == 201

    obligation = await auth_client.post(
        "/api/obligations",
        json={
            "name": "Rent autopay",
            "bucket": "necessity",
            "categoryId": categories["Rent"],
            "estimatedAmount": 400,
            "currency": "PEN",
            "dueDay": 10,
        },
    )
    assert obligation.status_code == 201

    savings_obligation = await auth_client.post(
        "/api/obligations",
        json={
            "name": "Monthly saving",
            "bucket": "save_invest",
            "categoryId": categories["Transfer"],
            "estimatedAmount": 80,
            "currency": "PEN",
            "dueDay": 12,
        },
    )
    assert savings_obligation.status_code == 201

    linked = await auth_client.patch(
        f"/api/obligations/{obligation.json()['id']}/link",
        json={"movementId": necessity.json()["id"]},
    )
    assert linked.status_code == 200

    unclassified = await auth_client.post(
        "/api/movements",
        json={
            "type": "expense",
            "amount": 50,
            "description": "Unknown",
            "date": "2026-04-13T12:00:00",
            "accountId": account_id,
            "categoryId": custom_category.json()["id"],
        },
    )
    assert unclassified.status_code == 201

    goal = await auth_client.post(
        "/api/goals",
        json={
            "name": "Emergency Fund",
            "type": "savings",
            "targetAmount": 1000,
            "currency": "PEN",
        },
    )
    assert goal.status_code == 201

    allocation = await auth_client.post(
        f"/api/goals/{goal.json()['id']}/allocate",
        json={
            "amount": 120,
            "movementId": necessity.json()["id"],
        },
    )
    assert allocation.status_code == 201

    response = await auth_client.get(
        "/api/budgeting/summary?year=2026&month=4&currency=PEN"
    )

    assert response.status_code == 200
    payload = response.json()
    buckets = {bucket["key"]: bucket for bucket in payload["buckets"]}

    assert payload["income"] == 1000
    assert payload["unclassifiedExpenseAmount"] == 50
    assert buckets["necessity"]["targetAmount"] == 500
    assert buckets["necessity"]["actualAmount"] == 400
    assert buckets["necessity"]["fixedAmount"] == 400
    assert buckets["necessity"]["variableAmount"] == 0
    assert buckets["desire"]["targetAmount"] == 300
    assert buckets["desire"]["actualAmount"] == 150
    assert buckets["desire"]["fixedAmount"] == 0
    assert buckets["desire"]["variableAmount"] == 150
    assert buckets["save_invest"]["targetAmount"] == 200
    assert buckets["save_invest"]["fixedAmount"] == 80
    assert buckets["save_invest"]["variableAmount"] == 120
    assert buckets["save_invest"]["actualAmount"] == 200


@pytest.mark.asyncio
async def test_budget_summary_converts_mixed_currency_activity(
    auth_client: AsyncClient,
):
    categories_response = await auth_client.get("/api/categories")
    categories = {item["name"]: item["id"] for item in categories_response.json()}

    usd_account = (
        await auth_client.post(
            "/api/accounts",
            json={
                "name": "Main USD",
                "currency": "USD",
                "initialBalance": 0,
                "color": "#3b82f6",
            },
        )
    ).json()["id"]
    pen_account = (
        await auth_client.post(
            "/api/accounts",
            json={
                "name": "Main PEN",
                "currency": "PEN",
                "initialBalance": 0,
                "color": "#10b981",
            },
        )
    ).json()["id"]

    income_response = await auth_client.post(
        "/api/movements",
        json={
            "type": "income",
            "amount": 2240,
            "description": "Monthly income",
            "date": "2026-04-10T12:00:00",
            "accountId": usd_account,
            "categoryId": categories["Salary"],
        },
    )
    assert income_response.status_code == 201

    expense_response = await auth_client.post(
        "/api/movements",
        json={
            "type": "expense",
            "amount": 3791.84,
            "description": "Rent in PEN",
            "date": "2026-04-11T12:00:00",
            "accountId": pen_account,
            "categoryId": categories["Rent"],
        },
    )
    assert expense_response.status_code == 201

    response = await auth_client.get(
        "/api/budgeting/summary?year=2026&month=4&currency=USD"
    )

    assert response.status_code == 200
    payload = response.json()
    buckets = {bucket["key"]: bucket for bucket in payload["buckets"]}

    assert payload["income"] == 2240
    assert round(buckets["necessity"]["targetAmount"], 2) == 1120
    assert round(buckets["necessity"]["variableAmount"], 2) == 1024.82


@pytest.mark.asyncio
async def test_delete_movement_cleans_goal_allocations_and_obligation_links(
    auth_client: AsyncClient,
):
    categories_response = await auth_client.get("/api/categories")
    categories = {item["name"]: item["id"] for item in categories_response.json()}

    account_id = (
        await auth_client.post(
            "/api/accounts",
            json={
                "name": "Main PEN",
                "currency": "PEN",
                "initialBalance": 1000,
                "color": "#10b981",
            },
        )
    ).json()["id"]

    movement = await auth_client.post(
        "/api/movements",
        json={
            "type": "expense",
            "amount": 200,
            "description": "Rent payment",
            "date": "2026-04-11T12:00:00",
            "accountId": account_id,
            "categoryId": categories["Rent"],
        },
    )
    assert movement.status_code == 201

    obligation = await auth_client.post(
        "/api/obligations",
        json={
            "name": "Rent autopay",
            "bucket": "necessity",
            "categoryId": categories["Rent"],
            "estimatedAmount": 200,
            "currency": "PEN",
            "dueDay": 10,
        },
    )
    assert obligation.status_code == 201

    linked = await auth_client.patch(
        f"/api/obligations/{obligation.json()['id']}/link",
        json={"movementId": movement.json()["id"]},
    )
    assert linked.status_code == 200

    goal = await auth_client.post(
        "/api/goals",
        json={
            "name": "Emergency Fund",
            "type": "savings",
            "targetAmount": 1000,
            "currency": "PEN",
        },
    )
    assert goal.status_code == 201

    allocation = await auth_client.post(
        f"/api/goals/{goal.json()['id']}/allocate",
        json={"amount": 50, "movementId": movement.json()["id"]},
    )
    assert allocation.status_code == 201

    delete_response = await auth_client.delete(
        f"/api/movements/{movement.json()['id']}"
    )
    assert delete_response.status_code == 204

    obligations = await auth_client.get("/api/obligations")
    deleted_obligation = next(
        item for item in obligations.json() if item["id"] == obligation.json()["id"]
    )
    assert deleted_obligation["linkedMovementId"] is None

    allocations = await auth_client.get(f"/api/goals/{goal.json()['id']}/allocations")
    assert allocations.status_code == 200
    assert allocations.json() == []
