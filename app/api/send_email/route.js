import { NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
//BACKEND API OF SENDGRID
//This API will handle sending emails using SendGrid.
export async function POST(req) {
     try{
        const body = await req.json(); //Parse JSON body
        const {to,subject,text,html} = body; //extract email details



        // Validate the 'to' field
        if (!to) {
            return NextResponse.json(
                { success: false, error: 'Recipient email (to) is required.' },
                { status: 400 }
            );
        }

        console.log('Email request body:', body);


        //send email using sendgrid
        const msg = {
            to, //Receiver email
            from: 'flash.o.ramaofficial@gmail.com', //sender email (must be verified in SendGrid)!
            subject,
            text,
            html,
        };
        const response = await sgMail.send(msg);
        console.log('SendGrid Response:', response);
        return NextResponse.json({ success: true, message: 'Email sent successfully!' });
     }
     catch (error) {
        console.error("Error sending email:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
