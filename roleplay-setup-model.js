export const ROLEPLAY_STEPS = ['yourRole', 'floRole', 'duration', 'mode'];
const profiles = [
  { match: /senior.*design|design.*interview|interview.*design/i, roles: ['Candidate', 'Senior designer', 'Product designer'], flo: ['Hiring manager', 'Design lead', 'Startup founder'] },
  { match: /architect|system design/i, roles: ['Software engineer', 'Tech lead', 'Solutions architect'], flo: ['Senior architect', 'Engineering manager', 'Technical stakeholder'] },
  { match: /code review|pull request|\bPR\b/i, roles: ['PR Author', 'Code Reviewer', 'Tech Lead'], flo: ['Senior reviewer', 'Teammate', 'Engineering manager'] },
  { match: /customer|escalat|outage/i, roles: ['Account manager', 'Support lead', 'Customer success manager'], flo: ['Frustrated customer', 'Enterprise buyer', 'Customer’s team lead'] },
  { match: /feedback|1:1|manager/i, roles: ['Team manager', 'Teammate', 'Team lead'], flo: ['Direct report', 'Defensive teammate', 'Your manager'] },
  { match: /exam|thesis|professor/i, roles: ['Student', 'Researcher', 'Project presenter'], flo: ['Examiner', 'Professor', 'Review panel member'] },
  { match: /salary|negotiat|compensation/i, roles: ['Employee', 'Job candidate', 'Team lead'], flo: ['Hiring manager', 'Recruiter', 'Your manager'] },
  { match: /founder|invest|fundrais|pitch/i, roles: ['Founder', 'Co-founder', 'Startup operator'], flo: ['Investor', 'Venture partner', 'Angel investor'] },
  { match: /interview|job/i, roles: ['Job candidate', 'Career switcher', 'Internal candidate'], flo: ['Hiring manager', 'Technical interviewer', 'Recruiter'] },
];
export function suggestionsFor(scenario) {
  const profile = profiles.find(item => item.match.test(scenario));
  return profile || { roles: ['Team member', 'Team lead', 'Presenter'], flo: ['Colleague', 'Manager', 'Stakeholder'] };
}
export function validAnswer(key, value) {
  if (key === 'duration') return Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 60 && String(value).trim() !== '';
  if (key === 'mode') return ['Practice', 'Graded'].includes(value);
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 80;
}
export function defaultAnswer(key, suggestions) {
  return { yourRole: suggestions.roles[0], floRole: suggestions.flo[0], duration: '10', mode: 'Practice' }[key];
}
export function createRoleplayConfig(scenario, answers) {
  if (!scenario.trim() || !ROLEPLAY_STEPS.every(key => validAnswer(key, answers[key]))) return null;
  return { scenario: scenario.trim(), yourRole: answers.yourRole.trim(), floRole: answers.floRole.trim(), durationMinutes: Number(answers.duration), mode: answers.mode.toLowerCase() };
}
