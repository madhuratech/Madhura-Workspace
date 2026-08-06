const { Resend } = require('resend');

const resend = new Resend('re_QkkZ8EiA_EYtVJxUBnezS2DDssLc3JChX');

async function test() {
  try {
    const data = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'virat1811muthu@gmail.com',
      subject: 'Test Email',
      html: '<p>Test</p>'
    });   
    console.log('Success:', data);
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
