/**
 * What KINETIQ does with a learner's information, in plain words.
 *
 * The one fact that most needed saying was nowhere on the site: a question
 * asked of KIT, together with any image attached to it, is sent on to a
 * third-party AI provider. Everything here describes what the code actually
 * does, checked against it, rather than making promises it does not keep.
 * When the behaviour changes, this page has to change with it.
 */

const UPDATED = '10 September 2026';
const REPO = 'https://github.com/JashwanthVaka/phylab';

const section = (title, body) => `<section class="lesson-section privacy-section">
  <h2>${title}</h2>
  ${body}
</section>`;

export function privacyPage() {
  return `<section class="page privacy-page">
    <p class="eyebrow">PRIVACY</p>
    <h1>What KINETIQ does with your information.</h1>
    <p class="page-lead">Written plainly, and describing what the site actually does. Last updated ${UPDATED}.</p>

    <div class="privacy-summary">
      <h2>The short version</h2>
      <ul>
        <li>You can use every part of KINETIQ without an account. Your progress then stays in your own browser.</li>
        <li>Questions you ask KIT, and any image you attach, are sent to an AI provider to be answered.</li>
        <li>There is no advertising, no analytics and no tracking.</li>
      </ul>
    </div>

    ${section('Studying without an account', `
      <p>Your progress is saved in this browser's storage on your own device. Nothing about it is sent to KINETIQ. That includes:</p>
      <ul>
        <li>lessons you have completed, and your flashcard and mistake-bank review schedules</li>
        <li>your practice results and answers you saved for review</li>
        <li>your internal assessment draft</li>
        <li>your KIT conversations, and a name and course level if you set one</li>
        <li>whether you prefer the light or dark theme</li>
      </ul>
      <p>Because it lives in your browser, it does not follow you to another device. You can save a copy from <a href="/progress" data-route>your progress page</a>, and you can delete all of it by clearing this site's data in your browser settings.</p>`)}

    ${section('Asking KIT', `
      <p>When you ask KIT a question, your browser sends KINETIQ's server your question, the conversation so far, the teaching mode you chose, which lesson, formula or lab you were looking at, and any image you attached.</p>
      <p>The server passes that on to an AI provider to write the answer. The providers this site can use are OpenAI, Groq, Anthropic and Google, and the one in use depends on how the site is set up. Each handles what it receives under its own privacy policy.</p>
      <p>KINETIQ's server does not keep your questions or images after the answer is sent. Your browser keeps the conversation so you can return to it, and if you are signed in it is saved to your account. Please do not put personal details, such as your full name, school or contact information, into a question or an image.</p>
      <p>If KIT cannot reach a provider, it answers from KINETIQ's own lessons instead, and that answer is worked out on KINETIQ's server without being sent anywhere else.</p>`)}

    ${section('Accounts', `
      <p>Accounts are optional, and signing in is not required for anything on the site.</p>
      <p>When accounts are switched on, you sign in with an existing Google or Apple account. KINETIQ does not see or store a password. From the provider it receives your email address and, where you have one, your name.</p>
      <p>Your account then stores your profile, lesson progress, practice results, saved KIT conversations and bookmarks, using the database service Supabase. Other students cannot see your work. The site owner runs that database, so the owner can.</p>
      <p>The site owner can see a list of accounts showing each email address, how it signed in, when it joined and when it last signed in. The owner cannot see your password, because there is none.</p>`)}

    ${section('Services the site loads', `
      <ul>
        <li><b>Vercel</b> hosts the site and, like any web host, records standard request details such as your IP address and the time.</li>
        <li><b>Google Fonts</b> supplies the typefaces, so your browser requests them from Google, which can see your IP address.</li>
        <li><b>esm.sh</b> supplies the sign-in library, and is contacted only when you use sign-in.</li>
      </ul>`)}

    ${section('Questions about your data', `
      <p>You can raise a question about this page or your data on the <a href="${REPO}/issues" rel="noopener noreferrer" target="_blank">project's public issue tracker</a>. Please do not post personal details there, since it is public.</p>`)}
  </section>`;
}
