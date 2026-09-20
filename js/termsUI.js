const UPDATED = '20 September 2026';
const REPO = 'https://github.com/JashwanthVaka/phylab';

const section = (title, body) => `<section class="lesson-section privacy-section"><h2>${title}</h2>${body}</section>`;

/** Plain-language terms that match the product as it exists today. */
export function termsPage() {
  return `<section class="page privacy-page">
    <p class="eyebrow">TERMS OF USE</p>
    <h1>Rules for using KINETIQ.</h1>
    <p class="page-lead">These terms describe the current free study platform. Last updated ${UPDATED}.</p>

    ${section('Educational purpose', `
      <p>KINETIQ provides independent study support for IBDP Physics. It is not produced, approved or endorsed by the International Baccalaureate Organization, and it does not replace a teacher, school course, official subject guide or examination instructions.</p>
      <p>Practice scores and structured-response feedback are KINETIQ practice marking, not official IB grades. Check important academic decisions against your teacher and current official material.</p>`)}

    ${section('Accounts and your work', `
      <p>You may study as a guest or sign in. You are responsible for access to the Google or email account used to sign in. Do not use another person's account or try to view, change or export another learner's work.</p>
      <p>Signed-in study records are kept separately for each account. Guest work remains on that browser unless you move it into an account. You should keep your own copy of important drafts and progress exports.</p>`)}

    ${section('Original learning material', `
      <p>KINETIQ lessons, original practice questions, explanations, diagrams and software may be used for personal study. You may print a revision pack for your own learning. Do not copy the question bank, republish substantial parts of the course, sell the material, or present it as your own product.</p>
      <p>External resources remain subject to their publishers' own terms. A link does not transfer ownership or permission to redistribute that material.</p>`)}

    ${section('Acceptable use', `
      <p>Do not attack, overload, probe or disrupt the service; bypass access controls; upload malware; automate bulk extraction; impersonate another person; or use KINETIQ to infringe copyright, privacy or other rights. Reasonable security controls and usage limits may be applied to protect learners and the service.</p>`)}

    ${section('Availability and changes', `
      <p>KINETIQ is currently provided without a paid plan. Features may change as the course and platform improve. The service may occasionally be unavailable for maintenance, hosting failures or third-party outages. No subscription or payment obligation is created unless a paid plan and its price are clearly presented and accepted in the future.</p>`)}

    ${section('Privacy and contact', `
      <p>The <a href="/privacy" data-route>privacy page</a> explains what information is stored and which services process it. Questions can be raised on the <a href="${REPO}/issues" rel="noopener noreferrer" target="_blank">public project issue tracker</a>. Do not include personal or account details in a public issue.</p>`)}
  </section>`;
}
