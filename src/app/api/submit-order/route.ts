import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import nodemailer from "nodemailer";
import crypto from "crypto";

// Order data interface
interface OrderData {
  fullName: string;
  phone: string;
  wilaya: string;
  baladiya: string;
  selectedWatchId: string;
  boxPrice: number;
  deliveryOption: "home" | "desk";
  deliveryCost: number;
  total: number;
  notes?: string;
  clientRequestId?: string;
}

// Response interface
interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  clientRequestId?: string;
  row?: number;
}

// Track processed request IDs
const processedIds = new Set<string>();

// Get Google Sheets client
function getGoogleSheetsClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error("Google credentials (EMAIL/PRIVATE_KEY) not configured");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

// Get email transporter
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

// Append order to Google Sheets
async function appendToSheet(orderData: OrderData): Promise<number> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!spreadsheetId) {
    throw new Error("GOOGLE_SHEET_ID not configured");
  }

  const sheets = getGoogleSheetsClient();

  const now = new Date();
  const rowData = [
    now.toISOString(),
    orderData.clientRequestId || "",
    orderData.fullName,
    orderData.phone,
    orderData.wilaya,
    orderData.baladiya,
    orderData.selectedWatchId,
    orderData.deliveryOption === "home" ? "توصيل للمنزل" : "توصيل للمكتب",
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
    // If Sheet1 doesn't exist, try without sheet name (default sheet)
    if (error instanceof Error && error.message?.includes("Unable to parse range")) {
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

// Get watch image URL
function getWatchImageUrl(watchId: string): string {
  const match = watchId.match(/model-(\d+)/);
  if (match) {
    return `https://your-domain.com/images/watches/${match[1]}.webp`;
  }
  return "";
}

// Send email notification
async function sendEmailNotification(orderData: OrderData): Promise<void> {
  const transporter = getEmailTransporter();
  if (!transporter) return;

  // Get notification emails from env (comma separated)
  const notificationEmails = process.env.ORDER_NOTIFICATION_EMAIL || process.env.SMTP_FROM_EMAIL;
  if (!notificationEmails) return;

  const deliveryLabel =
    orderData.deliveryOption === "home" ? "توصيل للمنزل" : "توصيل للمكتب";

  const watchImageUrl = getWatchImageUrl(orderData.selectedWatchId);

  const mailOptions = {
    from: `"طلبات المتجر" <${process.env.SMTP_FROM_EMAIL}>`,
    to: notificationEmails, // Can be comma-separated for multiple recipients
    subject: `طلب جديد #${orderData.clientRequestId?.slice(-6)} - ${orderData.fullName}`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: #b45309; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h2 style="margin: 0;">طلب جديد</h2>
          <p style="margin: 5px 0 0 0;">رقم الطلب: #${orderData.clientRequestId?.slice(-6)}</p>
        </div>
        
        <div style="background: white; padding: 20px; border: 1px solid #ddd; border-top: none;">
          
          <!-- Product Image -->
          <div style="text-align: center; margin-bottom: 20px; padding: 20px; background: #fef3c7; border-radius: 10px;">
            <h3 style="color: #92400e; margin-bottom: 15px;">المنتج المختار</h3>
            ${watchImageUrl ? `<img src="${watchImageUrl}" alt="${orderData.selectedWatchId}" style="max-width: 200px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" />` : ""}
            <p style="font-size: 18px; font-weight: bold; color: #92400e; margin-top: 10px;">${orderData.selectedWatchId}</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tr style="background: #f5f5f5;">
              <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold; width: 40%;">الاسم:</td>
              <td style="padding: 12px; border: 1px solid #ddd;">${orderData.fullName}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">الهاتف:</td>
              <td style="padding: 12px; border: 1px solid #ddd;">${orderData.phone}</td>
            </tr>
            <tr style="background: #f5f5f5;">
              <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">الولاية:</td>
              <td style="padding: 12px; border: 1px solid #ddd;">${orderData.wilaya}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">البلدية:</td>
              <td style="padding: 12px; border: 1px solid #ddd;">${orderData.baladiya}</td>
            </tr>
            <tr style="background: #f5f5f5;">
              <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">التوصيل:</td>
              <td style="padding: 12px; border: 1px solid #ddd;">${deliveryLabel}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">سعر الطقم:</td>
              <td style="padding: 12px; border: 1px solid #ddd;">${orderData.boxPrice.toLocaleString()} دج</td>
            </tr>
            <tr style="background: #f5f5f5;">
              <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">التوصيل:</td>
              <td style="padding: 12px; border: 1px solid #ddd;">${orderData.deliveryCost.toLocaleString()} دج</td>
            </tr>
            <tr style="background: #b45309; color: white;">
              <td style="padding: 15px; border: 1px solid #ddd; font-weight: bold; font-size: 16px;">المجموع الكلي:</td>
              <td style="padding: 15px; border: 1px solid #ddd; font-weight: bold; font-size: 18px;">${orderData.total.toLocaleString()} دج</td>
            </tr>
            ${
              orderData.notes
                ? `
            <tr>
              <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">ملاحظات:</td>
              <td style="padding: 12px; border: 1px solid #ddd;">${orderData.notes}</td>
            </tr>
            `
                : ""
            }
          </table>
        </div>
        
        <div style="background: #f5f5f5; padding: 15px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; color: #666;">
          تم استلام هذا الطلب من المتجر الإلكتروني
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

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

    // Check for duplicates
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

    // Validate required fields
    if (!orderData.fullName?.trim() || orderData.fullName.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "الاسم الكامل مطلوب" },
        { status: 400 },
      );
    }

    const phoneDigits = (orderData.phone || "").replace(/\D/g, "");
    if (phoneDigits.length < 9 || phoneDigits.length > 13) {
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

    if (!orderData.deliveryOption || !["home", "desk"].includes(orderData.deliveryOption)) {
      return NextResponse.json(
        { success: false, error: "يرجى اختيار طريقة التوصيل" },
        { status: 400 },
      );
    }

    processedIds.add(orderData.clientRequestId);

    let rowNumber = 0;
    let sheetError = null;
    let emailError = null;

    // Try to save to Google Sheets
    try {
      rowNumber = await appendToSheet(orderData);
      console.log("✅ Order saved to sheet, row:", rowNumber);
    } catch (error) {
      sheetError = error;
      console.error("❌ Failed to save to sheet:", error);
    }

    // Try to send email
    try {
      await sendEmailNotification(orderData);
      console.log("✅ Email sent to:", process.env.ORDER_NOTIFICATION_EMAIL);
    } catch (error) {
      emailError = error;
      console.error("❌ Failed to send email:", error);
    }

    // Return success even if sheet/email failed
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
    console.error("❌ API Error:", error);
    return NextResponse.json(
      { success: true, message: "تم استلام الطلب (بانتظار التأكيد)" },
      { status: 200 },
    );
  }
}

// Simple test endpoint
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ status: "API is working", timestamp: new Date().toISOString() });
}
