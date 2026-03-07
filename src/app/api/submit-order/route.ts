import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import nodemailer from "nodemailer";
import crypto from "crypto";
import fs from "fs";
import path from "path";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
interface OrderData {
  fullName: string;
  phone: string;
  wilaya: string;
  baladiya: string;
  selectedWatchId: string;
  selectedWatchName?: string;
  boxPrice: number;
  deliveryOption: "home" | "desk";
  deliveryCost: number;
  total: number;
  notes?: string;
  clientRequestId?: string;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  clientRequestId?: string;
  row?: number;
}

// Dedup set
const processedIds = new Set<string>();

// ─────────────────────────────────────────────
// GOOGLE SHEETS
// ─────────────────────────────────────────────
function getGoogleSheetsClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  if (!clientEmail || !privateKey)
    throw new Error("Google credentials not configured");

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

async function appendToSheet(orderData: OrderData): Promise<number> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error("GOOGLE_SHEET_ID not configured");

  const sheets = getGoogleSheetsClient();
  const watchLabel = orderData.selectedWatchName || orderData.selectedWatchId;
  const deliveryLabel =
    orderData.deliveryOption === "home" ? "توصيل للمنزل" : "توصيل للمكتب";

  const rowData = [
    new Date().toISOString(),
    orderData.clientRequestId || "",
    orderData.fullName,
    orderData.phone,
    orderData.wilaya,
    orderData.baladiya,
    watchLabel,
    deliveryLabel,
    orderData.boxPrice.toString(),
    orderData.deliveryCost.toString(),
    orderData.total.toString(),
    orderData.notes || "",
    "جديد",
  ];

  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Sheet1!A:M",
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [rowData] },
    });
    const updatedRange = response.data.updates?.updatedRange || "";
    const rowMatch = updatedRange.match(/:(\d+)$/);
    return rowMatch ? parseInt(rowMatch[1], 10) : 0;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message?.includes("Unable to parse range")
    ) {
      const response = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "A:M",
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [rowData] },
      });
      const updatedRange = response.data.updates?.updatedRange || "";
      const rowMatch = updatedRange.match(/:(\d+)$/);
      return rowMatch ? parseInt(rowMatch[1], 10) : 0;
    }
    throw error;
  }
}

// ─────────────────────────────────────────────
// EMAIL
// ─────────────────────────────────────────────
function getEmailTransporter() {
  const emailUser = process.env.SMTP_FROM_EMAIL;
  const emailPass = process.env.SMTP_PASSWORD;
  const emailHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const emailPort = parseInt(process.env.SMTP_PORT || "587", 10);
  if (!emailUser || !emailPass) {
    console.warn("Email credentials not configured");
    return null;
  }

  return nodemailer.createTransport({
    host: emailHost,
    port: emailPort,
    secure: emailPort === 465,
    auth: { user: emailUser, pass: emailPass },
  });
}

function getWatchImageAttachment(watchId: string) {
  const match = watchId.match(/model-(\d+)/);
  if (!match) return null;
  const num = match[1];
  const imagePath = path.join(
    process.cwd(),
    "public",
    "images",
    "watches",
    `${num}.webp`,
  );

  try {
    const content = fs.readFileSync(imagePath);
    return {
      content,
      filename: `watch-${num}.webp`,
      cid: `watch-image-${num}@bsmonters`,
    };
  } catch (err) {
    console.error(`Failed to read image ${imagePath}:`, err);
    return null;
  }
}

async function sendEmailNotification(orderData: OrderData): Promise<void> {
  const transporter = getEmailTransporter();
  if (!transporter) return;

  const to =
    process.env.ORDER_NOTIFICATION_EMAIL || process.env.SMTP_FROM_EMAIL;
  if (!to) return;

  const watchName = orderData.selectedWatchName || orderData.selectedWatchId;
  const deliveryLabel =
    orderData.deliveryOption === "home" ? "توصيل للمنزل" : "توصيل للمكتب";
  const attachment = getWatchImageAttachment(orderData.selectedWatchId);

  const imageBlock = attachment
    ? `<img src="cid:${attachment.cid}" alt="${watchName}" style="max-width:220px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);" />`
    : "";

  const html = `
  <div dir="rtl" style="font-family:'Segoe UI',Tahoma,Arial,sans-serif;max-width:560px;margin:0 auto;background:#fafaf9;border-radius:16px;overflow:hidden;border:1px solid #e7e5e4;">
    <div style="background:linear-gradient(135deg,#292524,#1c1917);color:white;padding:28px;text-align:center;">
      <h2 style="margin:0;font-size:20px;font-weight:700;">طلب جديد</h2>
      <p style="margin:8px 0 0;opacity:.7;font-size:13px;">رقم الطلب: #${orderData.clientRequestId?.slice(-6)}</p>
    </div>
    <div style="padding:24px;">
      <div style="text-align:center;margin-bottom:24px;padding:20px;background:white;border-radius:12px;border:1px solid #e7e5e4;">
        <p style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#a8a29e;margin:0 0 12px;">الموديل المختار</p>
        ${imageBlock}
        <p style="font-size:18px;font-weight:700;color:#1c1917;margin:14px 0 4px;">${watchName}</p>
        <p style="font-size:13px;color:#78716c;margin:0;">${orderData.boxPrice.toLocaleString()} دج</p>
      </div>
      <table style="width:100%;border-collapse:collapse;background:white;border-radius:12px;overflow:hidden;border:1px solid #e7e5e4;">
        ${[
          ["الاسم", orderData.fullName],
          ["الهاتف", orderData.phone],
          ["الولاية", orderData.wilaya],
          ["البلدية", orderData.baladiya],
          ["التوصيل", deliveryLabel],
          ...(orderData.notes ? [["ملاحظات", orderData.notes]] : []),
        ]
          .map(
            ([label, value], i) => `
          <tr style="background:${i % 2 === 0 ? "#fafaf9" : "white"};">
            <td style="padding:12px 16px;font-weight:600;color:#78716c;font-size:13px;width:30%;">${label}</td>
            <td style="padding:12px 16px;font-size:14px;color:#1c1917;border-right:1px solid #f5f5f4;">${value}</td>
          </tr>
        `,
          )
          .join("")}
      </table>
      <div style="margin-top:20px;background:linear-gradient(135deg,#292524,#1c1917);border-radius:12px;padding:18px 20px;display:flex;justify-content:space-between;align-items:center;color:white;">
        <span style="font-weight:600;font-size:15px;">المجموع الكلي</span>
        <span style="font-weight:700;font-size:22px;">${orderData.total.toLocaleString()} دج</span>
      </div>
    </div>
    <div style="background:#f5f5f4;padding:14px;text-align:center;font-size:11px;color:#a8a29e;">
      تم استلام هذا الطلب من المتجر الإلكتروني — BS Monters
    </div>
  </div>`;

  await transporter.sendMail({
    from: `"BS Monters" <${process.env.SMTP_FROM_EMAIL}>`,
    to,
    subject: `طلب جديد #${orderData.clientRequestId?.slice(-6)} — ${orderData.fullName}`,
    attachments: attachment
      ? [
          {
            filename: attachment.filename,
            content: attachment.content,
            cid: attachment.cid,
            contentType: "image/webp",
          },
        ]
      : [],
    html,
  });
}

// ─────────────────────────────────────────────
// API HANDLERS
// ─────────────────────────────────────────────
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse>> {
  try {
    const orderData: OrderData = await request.json();

    if (!orderData.clientRequestId) {
      orderData.clientRequestId =
        crypto.randomUUID?.() ||
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    // Dedup
    if (processedIds.has(orderData.clientRequestId)) {
      return NextResponse.json(
        {
          success: true,
          message: "تم معالجة الطلب مسبقاً",
          clientRequestId: orderData.clientRequestId,
        },
        { status: 200 },
      );
    }

    // Validate
    if (!orderData.fullName?.trim() || orderData.fullName.trim().length < 4) {
      return NextResponse.json(
        { success: false, error: "الاسم الكامل مطلوب" },
        { status: 400 },
      );
    }
    const phoneDigits = (orderData.phone || "").replace(/\D/g, "");
    if (phoneDigits.length !== 10 || !/^0[567]/.test(phoneDigits)) {
      return NextResponse.json(
        { success: false, error: "رقم هاتف غير صالح" },
        { status: 400 },
      );
    }
    if (!orderData.wilaya?.trim()) {
      return NextResponse.json(
        { success: false, error: "الولاية مطلوبة" },
        { status: 400 },
      );
    }
    if (!orderData.baladiya?.trim()) {
      return NextResponse.json(
        { success: false, error: "البلدية مطلوبة" },
        { status: 400 },
      );
    }
    if (!orderData.selectedWatchId) {
      return NextResponse.json(
        { success: false, error: "يرجى اختيار الموديل" },
        { status: 400 },
      );
    }
    if (
      !orderData.deliveryOption ||
      !["home", "desk"].includes(orderData.deliveryOption)
    ) {
      return NextResponse.json(
        { success: false, error: "يرجى اختيار طريقة التوصيل" },
        { status: 400 },
      );
    }

    processedIds.add(orderData.clientRequestId);

    let rowNumber = 0;

    try {
      rowNumber = await appendToSheet(orderData);
      console.log("Order saved to sheet, row:", rowNumber);
    } catch (error) {
      console.error("Failed to save to sheet:", error);
    }

    try {
      await sendEmailNotification(orderData);
      console.log("Email sent to:", process.env.ORDER_NOTIFICATION_EMAIL);
    } catch (error) {
      console.error("Failed to send email:", error);
    }

    return NextResponse.json(
      {
        success: true,
        message: "تم استلام الطلب بنجاح",
        clientRequestId: orderData.clientRequestId,
        row: rowNumber,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: true, message: "تم استلام الطلب" },
      { status: 200 },
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
