/**
 * 通过 FormSubmit (formsubmit.co) 把询盘发送到站长邮箱。
 *
 * 安全说明：不使用裸邮箱地址，使用 FormSubmit 激活邮件下发的随机 ID ——
 * 邮箱地址不会暴露在网站代码和网络请求中。
 * 已激活端点：longviewchinatravel@gmail.com → d78027ce01d2f0ed82d17c61ee626b4d
 *
 * 邮件格式：table 模板，每个问题单独一行（问题 = 行标题，答案 = 行内容），
 * 客户不再需要对着无标注的答案猜问题。
 *
 * 失败（断网/服务异常）不影响本地保存，后台 /#/admin 始终留有备份。
 */

const FORMSUBMIT_ID = "d78027ce01d2f0ed82d17c61ee626b4d";

export async function sendLeadEmail(lead: {
  name: string;
  email: string;
  type: string;
  details: { label: string; value: string }[];
}): Promise<boolean> {
  // 每个问题作为独立字段 → 邮件表格里逐题标注
  const detailFields: Record<string, string> = {};
  for (const d of lead.details) {
    detailFields[d.label] = d.value;
  }
  try {
    const res = await fetch(`https://formsubmit.co/ajax/${FORMSUBMIT_ID}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        _subject: `[Longview China] New ${lead.type} request from ${lead.name}`,
        _template: "table",
        _captcha: "false",
        "Customer name": lead.name,
        "Customer email": lead.email,
        ...detailFields,
        "Submitted at": new Date().toLocaleString(),
      }),
      signal: AbortSignal.timeout(6000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
