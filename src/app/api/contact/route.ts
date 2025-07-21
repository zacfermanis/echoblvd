import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const { name, email, message } = await req.json();
    if (!name || !email || !message) {
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
        console.log('Message:', message);
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

    const mailOptions = {
      from: `Echo Blvd Website <${process.env.GMAIL_USER}>`,
      to: 'echoblvdband@gmail.com',
      subject: `New Contact Form Submission from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nMessage:\n${message}`,
      replyTo: email,
    };

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json({ error: 'Failed to send email.' }, { status: 500 });
  }
} 