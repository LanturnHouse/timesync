PLAN_CONFIG = {
    "lv1": {
        "label": "Level 1",
        "amount": 4900,
        "order_name": "TimeSync Lv1 구독",
    },
    "lv2": {
        "label": "Level 2",
        "amount": 9900,
        "order_name": "TimeSync Lv2 구독",
    },
    "lv3": {
        "label": "Level 3",
        "amount": 19900,
        "order_name": "TimeSync Lv3 구독",
    },
}

PLAN_CHOICES = [(k, v["label"]) for k, v in PLAN_CONFIG.items()]
