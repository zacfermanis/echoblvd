import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body?.name === 'string' ? body.name : '';
    const email = typeof body?.email === 'string' ? body.email : '';

    const isBooking =
      typeof body?.eventType === 'string' ||
      typeof body?.eventDate === 'string' ||
      typeof body?.location === 'string';

    const contactMessage =
      typeof body?.message === 'string' ? body.message : undefined;

    const eventType = typeof body?.eventType === 'string' ? body.eventType : undefined;
    const eventDate = typeof body?.eventDate === 'string' ? body.eventDate : undefined;
    const location = typeof body?.location === 'string' ? body.location : undefined;
    const guestCount =
      typeof body?.guestCount === 'string' && body.guestCount.trim().length > 0
        ? body.guestCount
        : undefined;
    const indoorOutdoor =
      typeof body?.indoorOutdoor === 'string' && body.indoorOutdoor.trim().length > 0
        ? body.indoorOutdoor
        : undefined;
    const powerAvailable =
      typeof body?.powerAvailable === 'string' && body.powerAvailable.trim().length > 0
        ? body.powerAvailable
        : undefined;
    const budgetRange =
      typeof body?.budgetRange === 'string' && body.budgetRange.trim().length > 0
        ? body.budgetRange
        : undefined;
    const additionalDetails =
      typeof body?.additionalDetails === 'string' && body.additionalDetails.trim().length > 0
        ? body.additionalDetails
        : undefined;

    if (!name || !email) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    if (!isBooking && !contactMessage) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // Check if environment variables are set
    if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
      console.error('Missing Gmail environment variables');
      
      // In development, log the form data instead of failing
      if (process.env.NODE_ENV === 'development') {
        console.log('=== CONTACT FORM SUBMISSION (DEV MODE) ===');
        console.log('Name:', name);
        console.log('Email:', email);
        console.log('Is booking:', isBooking);
        console.log('Body:', body);
        console.log('==========================================');
        return NextResponse.json({ 
          success: true,
          message: 'Form submitted successfully (development mode - check console for details)'
        });
      }
      
      return NextResponse.json({ 
        error: 'Email service not configured. Please contact the administrator.' 
      }, { status: 500 });
    }

    // Configure nodemailer transporter (using Gmail SMTP)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    function escapeHtml(value: string) {
      return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    }

    const commonFrom = `Echo Blvd Website <${process.env.GMAIL_USER}>`;

    const mailOptions: nodemailer.SendMailOptions = {
      from: commonFrom,
      to: 'booking@echoblvd.com',
      replyTo: email,
      subject: '',
      text: '',
    };

    if (isBooking) {
      const subjectName = eventType ? `${eventType}` : 'Event booking';
      mailOptions.subject = `New Booking Request from ${name} (${subjectName})`;

      const rows: Array<{ label: string; value?: string }> = [
        { label: 'Name', value: name },
        { label: 'Email', value: email },
        { label: 'Event Type', value: eventType },
        { label: 'Event Date', value: eventDate },
        { label: 'Location', value: location },
        { label: 'Guest Count', value: guestCount },
        { label: 'Indoor / Outdoor', value: indoorOutdoor },
        { label: 'Power Available', value: powerAvailable },
        { label: 'Budget Range', value: budgetRange },
      ];

      const detailsHtml = additionalDetails
        ? `<h3 style="margin:18px 0 8px;font-size:14px;color:#111827;">Additional details</h3>
           <p style="white-space:pre-wrap;margin:0;color:#374151;font-size:14px;line-height:1.5;">${escapeHtml(
             additionalDetails
           )}</p>`
        : '';

      const rowsHtml = rows
        .filter((r) => typeof r.value === 'string' && r.value.trim().length > 0)
        .map(
          (r) => `
          <tr>
            <td style="padding:8px 12px;vertical-align:top;font-weight:600;color:#111827;">${escapeHtml(
              r.label
            )}</td>
            <td style="padding:8px 12px;vertical-align:top;color:#374151;">${escapeHtml(
              r.value as string
            )}</td>
          </tr>`
        )
        .join('');

      mailOptions.html = `
        <div style="font-family:Arial,Helvetica,sans-serif;background:#f9fafb;padding:24px;">
          <div style="max-width:760px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:18px 18px 8px;">
            <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">New Booking Request</h2>
            <p style="margin:0 0 14px;color:#6b7280;font-size:14px;line-height:1.5;">
              A new event inquiry has been submitted through the Echo Blvd booking form.
            </p>
            <table style="border-collapse:collapse;width:100%;">
              ${rowsHtml}
            </table>
            ${detailsHtml}
            <p style="margin:18px 0 0;color:#9ca3af;font-size:12px;">
              Reply-to: ${escapeHtml(email)}
            </p>
          </div>
        </div>
      `;

      mailOptions.text = [
        'New Booking Request',
        `Name: ${name}`,
        `Email: ${email}`,
        eventType ? `Event Type: ${eventType}` : undefined,
        eventDate ? `Event Date: ${eventDate}` : undefined,
        location ? `Location: ${location}` : undefined,
        guestCount ? `Guest Count: ${guestCount}` : undefined,
        indoorOutdoor ? `Indoor / Outdoor: ${indoorOutdoor}` : undefined,
        powerAvailable ? `Power Available: ${powerAvailable}` : undefined,
        budgetRange ? `Budget Range: ${budgetRange}` : undefined,
        additionalDetails ? '' : undefined,
        additionalDetails ? `Additional details:\n${additionalDetails}` : undefined,
      ]
        .filter(Boolean)
        .join('\n');
    } else {
      mailOptions.subject = `New Contact Form Submission from ${name}`;
      const safeMessage = typeof contactMessage === 'string' ? contactMessage : '';

      mailOptions.html = `
        <div style="font-family:Arial,Helvetica,sans-serif;background:#f9fafb;padding:24px;">
          <div style="max-width:760px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:18px 18px 8px;">
            <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">New Contact Form Submission</h2>
            <table style="border-collapse:collapse;width:100%;">
              <tr>
                <td style="padding:8px 12px;vertical-align:top;font-weight:600;color:#111827;">Name</td>
                <td style="padding:8px 12px;vertical-align:top;color:#374151;">${escapeHtml(name)}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px;vertical-align:top;font-weight:600;color:#111827;">Email</td>
                <td style="padding:8px 12px;vertical-align:top;color:#374151;">${escapeHtml(
                  email
                )}</td>
              </tr>
            </table>
            <h3 style="margin:18px 0 8px;font-size:14px;color:#111827;">Message</h3>
            <p style="white-space:pre-wrap;margin:0;color:#374151;font-size:14px;line-height:1.5;">${escapeHtml(
              safeMessage
            )}</p>
            <p style="margin:18px 0 0;color:#9ca3af;font-size:12px;">
              Reply-to: ${escapeHtml(email)}
            </p>
          </div>
        </div>
      `;
      mailOptions.text = `Name: ${name}\nEmail: ${email}\nMessage:\n${safeMessage}`;
    }

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json({ error: 'Failed to send email.' }, { status: 500 });
  }
} 