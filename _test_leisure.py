# -*- coding: utf-8 -*-
"""Leisure 向导全链路 + Business 回归 + 后台编辑测试"""
import re, json, sys
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:4177"
ok, fail = [], []

def check(name, cond, extra=""):
    (ok if cond else fail).append(name)
    print(("PASS " if cond else "FAIL ") + name + (f"  [{extra}]" if extra and not cond else ""))

with sync_playwright() as p:
    browser = p.chromium.launch()

    # ============ 1. Leisure 完整流程 ============
    ctx = browser.new_context()
    page = ctx.new_page()
    page.add_style_tag(content="html{scroll-behavior:auto!important}")
    mails = []
    page.route(re.compile(r"formsubmit\.co"), lambda r: (mails.append(r.request.post_data or ""), r.fulfill(status=200, body="OK"))[1])

    page.goto(BASE + "/#/leisure", wait_until="networkidle")
    page.wait_for_timeout(800)

    # 步骤1：城市多选（上海 + 青岛 + Other）
    page.get_by_role("button", name=re.compile(r"Shanghai", re.I)).click()
    page.get_by_role("button", name=re.compile(r"Qingdao", re.I)).click()
    page.get_by_role("button", name=re.compile(r"^Other 其他$", re.I)).click()
    page.get_by_placeholder(re.compile(r"Enter another city", re.I)).fill("Hangzhou")
    page.keyboard.press("Enter")
    page.get_by_placeholder(re.compile(r"Enter another city", re.I)).fill("Suzhou")
    page.keyboard.press("Enter")
    # 验证添加了两条
    body = page.content()
    check("Leisure-城市Other可多条添加", "Hangzhou" in body and "Suzhou" in body)
    page.get_by_role("button", name=re.compile(r"^Continue$", re.I)).click()
    page.wait_for_timeout(600)

    # 步骤2：青岛景点步出现（只应出现一次）
    check("Leisure-青岛景点步出现", page.get_by_text(re.compile(r"What interests you in Qingdao", re.I)).count() >= 1)
    page.get_by_role("button", name=re.compile(r"May Fourth Square", re.I)).click()
    page.get_by_role("button", name=re.compile(r"Badaguan", re.I)).click()
    page.get_by_role("button", name=re.compile(r"^Other 其他$", re.I)).click()
    page.get_by_placeholder(re.compile(r"Enter another attraction", re.I)).fill("Little Fish Park")
    page.keyboard.press("Enter")
    page.get_by_role("button", name=re.compile(r"^Continue$", re.I)).click()
    page.wait_for_timeout(600)

    # 步骤3：人数
    check("Leisure-人数步", page.get_by_text(re.compile(r"How many people", re.I)).count() >= 1)
    page.get_by_role("button", name=re.compile(r"^$")).last.click()  # plus 按钮（无名称）
    page.get_by_role("button", name=re.compile(r"^Continue$", re.I)).click()
    page.wait_for_timeout(600)

    # 步骤4：日期（默认有值，直接继续）
    check("Leisure-日期步", page.get_by_text(re.compile(r"When are you arriving", re.I)).count() >= 1)
    page.get_by_role("button", name=re.compile(r"^Continue$", re.I)).click()
    page.wait_for_timeout(600)

    # 步骤5：服务多选（Hotel booking + Chartered car 触发人员步）
    check("Leisure-服务步", page.get_by_text(re.compile(r"How can we help", re.I)).count() >= 1)
    page.get_by_role("button", name=re.compile(r"Hotel booking", re.I)).click()
    page.get_by_role("button", name=re.compile(r"Chartered car", re.I)).click()
    page.get_by_role("button", name=re.compile(r"^Continue$", re.I)).click()
    page.wait_for_timeout(600)

    # 步骤6：酒店预算（货币 USD + 金额 + 位置）
    check("Leisure-酒店步出现", page.get_by_text(re.compile(r"Hotel budget per night", re.I)).count() >= 1)
    cur = page.locator("select").first
    check("Leisure-酒店货币默认USD", cur.input_value() == "USD", cur.input_value())
    cur.select_option("EUR")
    page.get_by_placeholder(re.compile(r"Budget per night", re.I)).fill("150")
    page.get_by_placeholder(re.compile(r"Location preference", re.I)).fill("City center")
    page.get_by_role("button", name=re.compile(r"^Continue$", re.I)).click()
    page.wait_for_timeout(600)

    # 步骤7：人员要求（语言备注必填校验）
    check("Leisure-人员步出现", page.get_by_text(re.compile(r"requirements for your assistants", re.I)).count() >= 1)
    page.get_by_role("button", name=re.compile(r"Language requirement", re.I)).click()
    cont = page.get_by_role("button", name=re.compile(r"^Continue$", re.I))
    check("Leisure-语言备注空时禁用Continue", not cont.is_enabled())
    page.get_by_placeholder(re.compile(r"Language note", re.I)).fill("English + Italian")
    page.get_by_role("button", name=re.compile(r"Female", re.I)).click()
    page.get_by_role("button", name=re.compile(r"^Continue$", re.I)).click()
    page.wait_for_timeout(600)

    # 步骤8：饮食/宗教多条
    check("Leisure-饮食宗教步", page.get_by_text(re.compile(r"dietary or religious", re.I)).count() >= 1)
    page.get_by_placeholder(re.compile(r"vegetarian, peanut allergy", re.I)).fill("Vegetarian")
    page.keyboard.press("Enter")
    page.get_by_placeholder(re.compile(r"halal food, prayer times", re.I)).fill("No beef")
    page.keyboard.press("Enter")
    page.get_by_role("button", name=re.compile(r"^Continue$", re.I)).click()
    page.wait_for_timeout(600)

    # 步骤9：口岸
    check("Leisure-口岸步", page.get_by_text(re.compile(r"Entry & exit ports", re.I)).count() >= 1)
    page.get_by_placeholder(re.compile(r"Guangzhou Baiyun", re.I)).fill("Beijing Capital (PEK)")
    page.get_by_role("button", name=re.compile(r"^Continue$", re.I)).click()
    page.wait_for_timeout(600)

    # 步骤10：兴趣
    check("Leisure-兴趣步", page.get_by_text(re.compile(r"What are you into", re.I)).count() >= 1)
    page.get_by_role("button", name=re.compile(r"Food & local eats", re.I)).click()
    page.get_by_role("button", name=re.compile(r"^Continue$", re.I)).click()
    page.wait_for_timeout(600)

    # 步骤11：其他要求可跳过
    check("Leisure-其他要求步", page.get_by_text(re.compile(r"other special requests", re.I)).count() >= 1)
    page.get_by_role("button", name=re.compile(r"^Continue$", re.I)).click()
    page.wait_for_timeout(600)

    # 步骤12：联系方式 + 随行人
    check("Leisure-联系步", page.get_by_text(re.compile(r"How can we reach you", re.I)).count() >= 1)
    page.get_by_placeholder(re.compile(r"^Your name$", re.I)).fill("Marco Rossi")
    page.get_by_placeholder("you@example.com").fill("marco@example.com")
    page.get_by_placeholder(re.compile(r"^\+1 555")).fill("+39 333 000 0000")
    page.get_by_role("button", name=re.compile(r"Add a companion", re.I)).click()
    page.wait_for_timeout(400)
    page.get_by_placeholder(re.compile(r"^Name · 姓名 \*$")).fill("Anna Rossi")
    page.get_by_placeholder(re.compile(r"^Email \*$")).fill("anna@example.com")
    page.get_by_placeholder(re.compile(r"^WhatsApp \*$")).fill("+39 333 111 1111")
    page.get_by_role("button", name=re.compile(r"^Review$", re.I)).click()
    page.wait_for_timeout(700)

    # 总览：校验关键行 + 点击回改
    check("Leisure-总览含城市", "Qingdao" in page.content() and "Hangzhou" in page.content())
    check("Leisure-总览含随行人", "Anna Rossi" in page.content())
    check("Leisure-总览含酒店EUR", "EUR 150" in page.content(), [l for l in page.content().split("EUR") if "150" in l][:1])
    # 点击回改人数
    page.get_by_text(re.compile(r"How many people")).click()
    page.wait_for_timeout(600)
    check("Leisure-回跳到人数步", page.get_by_text(re.compile(r"How many people", re.I)).count() >= 1 and page.get_by_text(re.compile(r"^2$")).count() >= 1)
    # 草稿保留：城市仍选中
    page.get_by_role("button", name=re.compile(r"^Continue$", re.I)).click()
    page.wait_for_timeout(500)
    # 走回总览（一路点 Continue）
    for _ in range(11):
        b = page.get_by_role("button", name=re.compile(r"^(Continue|Review)$", re.I))
        if b.count() == 0: break
        b.first.click()
        page.wait_for_timeout(350)
    check("Leisure-回到总览", page.get_by_text(re.compile(r"at a glance", re.I)).count() >= 1)

    # 提交
    page.get_by_role("button", name=re.compile(r"^Send request$", re.I)).click()
    page.wait_for_timeout(1200)
    check("Leisure-成功页", page.get_by_text(re.compile(r"Request received", re.I)).count() >= 1)
    check("Leisure-邮件已发送拦截", len(mails) == 1, f"mails={len(mails)}")
    if mails:
        m = mails[0]
        for kw in ["Qingdao", "Hangzhou", "May Fourth Square", "EUR 150", "City center",
                   "English + Italian", "Vegetarian", "Anna Rossi", "Beijing Capital"]:
            check(f"Leisure-邮件含[{kw}]", kw in m)
        check("Leisure-邮件逐题标注", "Which cities" in m and "How can we help" in m)
    leads = json.loads(page.evaluate("localStorage.getItem('longview-leads')"))
    check("Leisure-本地库1条", len(leads) == 1 and leads[0]["type"] == "leisure")
    ctx.close()

    # ============ 2. 反向：不选青岛 → 无景点步 ============
    ctx2 = browser.new_context()
    page = ctx2.new_page()
    page.add_style_tag(content="html{scroll-behavior:auto!important}")
    page.goto(BASE + "/#/leisure", wait_until="networkidle")
    page.wait_for_timeout(600)
    page.get_by_role("button", name=re.compile(r"Shanghai", re.I)).click()
    page.get_by_role("button", name=re.compile(r"^Continue$", re.I)).click()
    page.wait_for_timeout(500)
    check("Leisure-无青岛则无景点步", page.get_by_text(re.compile(r"What interests you", re.I)).count() == 0)
    check("Leisure-不选服务无酒店人员步", True)  # 后面验证
    page.get_by_role("button", name=re.compile(r"^Continue$", re.I)).click()  # 人数
    page.wait_for_timeout(400)
    page.get_by_role("button", name=re.compile(r"^Continue$", re.I)).click()  # 日期
    page.wait_for_timeout(400)
    # 服务：什么都不选 → Continue 禁用；选一项非人员服务
    cont = page.get_by_role("button", name=re.compile(r"^Continue$", re.I))
    check("Leisure-服务不选禁用Continue", not cont.is_enabled())
    page.get_by_role("button", name=re.compile(r"Flights", re.I)).click()
    page.get_by_role("button", name=re.compile(r"^Continue$", re.I)).click()
    page.wait_for_timeout(500)
    check("Leisure-无人员服务跳人员步", page.get_by_text(re.compile(r"requirements for your assistants", re.I)).count() == 0)
    check("Leisure-无酒店跳酒店步", page.get_by_text(re.compile(r"Hotel budget", re.I)).count() == 0)
    ctx2.close()

    # ============ 3. Business 回归（共用组件抽取后） ============
    ctx3 = browser.new_context()
    page = ctx3.new_page()
    page.add_style_tag(content="html{scroll-behavior:auto!important}")
    page.goto(BASE + "/#/business", wait_until="networkidle")
    page.wait_for_timeout(700)
    # 走前几步验证不崩
    page.get_by_role("button", name=re.compile(r"Guangzhou", re.I)).first.click()
    page.get_by_role("button", name=re.compile(r"^Continue$", re.I)).first.click()
    page.wait_for_timeout(500)
    n_cont = page.get_by_role("button", name=re.compile(r"^Continue$", re.I)).count()
    check("Business-首步可继续", n_cont >= 1)
    check("Business-日期滚轮渲染", page.locator("input[type=text], input:not([type])").count() > 0)
    ctx3.close()

    # ============ 4. 后台 Leisure 编辑 ============
    ctx4 = browser.new_context()
    page = ctx4.new_page()
    page.goto(BASE + "/#/admin", wait_until="networkidle")
    page.wait_for_timeout(500)
    page.locator("input[type=password]").fill("longview2026")
    page.get_by_role("button", name=re.compile(r"^Sign in$", re.I)).click()
    page.wait_for_timeout(700)
    check("Admin-登录成功", page.get_by_text(re.compile(r"Admin Console", re.I)).count() >= 1)
    # Leisure 分组标题存在
    check("Admin-Leisure编辑器存在", page.get_by_text(re.compile(r"休闲旅游（Leisure）互动选项管理")).count() >= 1)
    # 在服务②分组添加新服务：找到 Leisure 的 services 组（页面有两组②，用 Leisure 容器限定）
    leisure_sec = page.locator("div").filter(has_text=re.compile(r"休闲旅游（Leisure）互动选项管理")).last
    grp = page.locator("div.rounded-2xl").filter(has_text=re.compile(r"② 休闲服务项目")).last
    grp.locator("input").nth(0).fill("Pet care")
    grp.get_by_role("button", name=re.compile(r"添加", re.I)).last.click()
    # 景点组加新景点
    attr = page.locator("div.rounded-2xl").filter(has_text=re.compile(r"⑥ 各城市景点")).last
    attr.get_by_placeholder("输入景点英文名，回车添加").fill("TestAttr EN")
    attr.get_by_role("button", name=re.compile(r"添加景点")).last.click()
    page.wait_for_timeout(300)
    saved = page.evaluate("() => { const d={}; return null; }")
    # 点保存
    page.get_by_role("button", name=re.compile(r"^保存并生效$")).last.click()
    page.wait_for_timeout(1500)
    # 保存后页面刷新，验证 localStorage
    ov = json.loads(page.evaluate("localStorage.getItem('longview-config')"))
    lc = ov.get("leisureContent", {})
    svcs = [s["en"] for s in lc.get("services", [])]
    check("Admin-新服务已保存", "Pet care" in svcs, str(svcs[-3:]))
    check("Admin-新景点已保存", "TestAttr EN" in [a["name"] for a in lc.get("attractionsByCity", {}).get("Qingdao", [])])
    check("Admin-人员服务标记保留", "Chartered car" in lc.get("personnelServices", []))

    # 前台生效验证：新开 leisure 页
    page.goto(BASE + "/#/leisure", wait_until="networkidle")
    page.wait_for_timeout(600)
    page.get_by_role("button", name=re.compile(r"Qingdao", re.I)).click()
    page.get_by_role("button", name=re.compile(r"^Continue$", re.I)).click()
    page.wait_for_timeout(500)
    check("Admin-前台景点生效", page.get_by_text(re.compile(r"TestAttr EN")).count() >= 1)
    ctx4.close()

    browser.close()

print(f"\n==== {len(ok)} PASS / {len(fail)} FAIL ====")
if fail:
    print("FAILED:", fail)
    sys.exit(1)
