/**
 * What KINETIQ does with a learner's information, in plain words.
 *
 * The one fact that most needed saying was nowhere on the site: a question
 * asked of KIT, together with any image attached to it, is sent on to a
 * third-party AI provider. Everything here describes what the code actually
 * does, checked against it, rather than making promises it does not keep.
 * When the behaviour changes, this page has to change with it.
 */

const UPDATED = '25 September 2026';
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
        <li>Source-cited Ask KIT answers use KINETIQ's own course material. The optional generative tutor sends a question and any attached image to the configured AI provider.</li>
        <li>Signed-in notebook notes, highlights and personal flashcards are stored in the same owner-only account store as bookmarks so they can follow you across devices. Teachers cannot read them.</li>
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
      <p>The main Ask KIT page searches KINETIQ's original lessons, formulae, worked examples, cases and command-term guidance. That retrieval answer is produced on KINETIQ's server and is not sent to an external AI provider.</p>
      <p>If the optional generative tutor is enabled, your browser sends KINETIQ's server your question, the conversation so far, the teaching mode, relevant learning context and any image you attach. The server passes that request to the configured provider, which may be OpenAI, Groq, Anthropic or Google. Each provider handles what it receives under its own privacy policy.</p>
      <p>KINETIQ's server does not intentionally keep an uploaded image after responding. Your browser keeps Ask history so you can return to it. Please do not include your full name, school, contact details or another person's personal information in a question or image.</p>`)}

    ${section('Accounts', `
      <p>Accounts are optional, and signing in is not required for anything on the site.</p>
      <p>You can sign in with Google or request a password-free link to an email address you control. KINETIQ does not see or store a password. It receives your email address and, where the sign-in provider supplies one, your name.</p>
      <p>Your account then stores your profile, lesson progress, practice results, saved KIT conversations and bookmarks, using the database service Supabase. Other students cannot see your work.</p>
      <p>The site owner's administration page can see a list of accounts showing each email address, how it signed in, when it joined and when it last signed in. It cannot open your private study records. As the database operator, the owner can still access stored data through Supabase when needed to operate, secure or recover the service. The owner cannot see your password, because there is none.</p>
      <p>If you join a teacher's class, that teacher can see your display name and aggregate summaries: completed lesson count, assessed topic count and average mastery, and completed quiz count and marks. Teachers cannot directly open your profile or underlying lesson, topic or quiz records. They also cannot see your bookmarks, Ask KIT history, uploaded images or private revision notes. You can leave a class at any time, which immediately removes the teacher's access to these summaries.</p>`)}

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
