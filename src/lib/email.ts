// Email utility — uses nodemailer if SMTP is configured, otherwise logs to console

const ADMIN_EMAIL = process.env.NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || "yavuzpullukcu@gmail.com";
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

async function getTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodemailer = require("nodemailer");
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  } catch {
    return null;
  }
}

export async function sendApprovalRequestEmail(user: {
  firstName: string;
  lastName: string;
  email: string;
  id: number;
}) {
  const approveUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/admin?approve=${user.id}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1e3a5f;">🔔 Yeni Kayıt Başvurusu</h2>
      <p>Recuter sistemine yeni bir kullanıcı kayıt oldu ve onayınızı bekliyor.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 8px; font-weight: bold; color: #555;">Ad Soyad:</td>
          <td style="padding: 8px;">${user.firstName} ${user.lastName}</td>
        </tr>
        <tr style="background: #f9f9f9;">
          <td style="padding: 8px; font-weight: bold; color: #555;">Email:</td>
          <td style="padding: 8px;">${user.email}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold; color: #555;">Kayıt Tarihi:</td>
          <td style="padding: 8px;">${new Date().toLocaleString("tr-TR")}</td>
        </tr>
      </table>
      <div style="margin: 30px 0; text-align: center;">
        <a href="${approveUrl}"
           style="background: #22c55e; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold;">
          ✅ Kullanıcıyı Onayla
        </a>
      </div>
      <p style="color: #888; font-size: 13px;">
        Bu butona tıklamak yerine <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/admin">Admin Panel</a>'e gidip
        "Bekleyen Kullanıcılar" sekmesinden de onaylayabilirsiniz.
      </p>
    </div>
  `;

  const transporter = await getTransporter();

  if (!transporter) {
    console.log("━━━ EMAIL (SMTP not configured) ━━━");
    console.log(`TO: ${ADMIN_EMAIL}`);
    console.log(`SUBJECT: Yeni Kayıt: ${user.firstName} ${user.lastName} <${user.email}>`);
    console.log(`Approve URL: ${approveUrl}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    return;
  }

  await transporter.sendMail({
    from: `"Recuter" <${SMTP_FROM}>`,
    to: ADMIN_EMAIL,
    subject: `🔔 Yeni Kayıt Bekliyor: ${user.firstName} ${user.lastName}`,
    html,
  });
}

export async function sendApprovalConfirmEmail(user: {
  firstName: string;
  email: string;
}) {
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #22c55e;">✅ Hesabınız Onaylandı!</h2>
      <p>Merhaba ${user.firstName},</p>
      <p>Recuter hesabınız admin tarafından onaylandı. Artık sisteme giriş yapabilirsiniz.</p>
      <div style="margin: 30px 0; text-align: center;">
        <a href="${loginUrl}"
           style="background: #1e3a5f; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold;">
          Giriş Yap
        </a>
      </div>
    </div>
  `;

  const transporter = await getTransporter();
  if (!transporter) {
    console.log(`EMAIL (no SMTP): Approval confirmation would be sent to ${user.email}`);
    return;
  }

  await transporter.sendMail({
    from: `"Recuter" <${SMTP_FROM}>`,
    to: user.email,
    subject: "✅ Recuter Hesabınız Onaylandı",
    html,
  });
}
