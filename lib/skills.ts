// Each entry: canonical name followed by aliases that should count as the same skill.
const GROUPS: string[][] = [
  // Languages
  ["JavaScript", "js", "ecmascript", "es6"],
  ["TypeScript"],
  ["Python"],
  ["Java"],
  ["Kotlin"],
  ["Swift"],
  ["C#", "c sharp"],
  ["C++", "cpp"],
  ["Go", "golang"],
  ["Rust"],
  ["Ruby"],
  ["PHP"],
  ["Scala"],
  ["Dart"],
  ["Lua", "luau"],
  ["SQL"],
  ["Bash", "shell scripting"],
  // Frontend
  ["React", "react.js", "reactjs"],
  ["Next.js", "nextjs", "next js"],
  ["Vue", "vue.js", "vuejs"],
  ["Nuxt", "nuxt.js"],
  ["Angular", "angularjs"],
  ["Svelte", "sveltekit"],
  ["HTML", "html5"],
  ["CSS", "css3"],
  ["Tailwind", "tailwind css", "tailwindcss"],
  ["Sass", "scss"],
  ["Redux"],
  ["Webpack"],
  ["Vite"],
  ["React Native"],
  ["Flutter"],
  ["Accessibility", "wcag", "a11y"],
  // Backend
  ["Node.js", "node", "nodejs", "node js"],
  ["Express", "express.js", "expressjs", "express js"],
  ["NestJS", "nest.js"],
  ["Django"],
  ["Flask"],
  ["FastAPI"],
  ["Spring", "spring boot"],
  [".NET", "dotnet", "asp.net"],
  ["Rails", "ruby on rails", "ror"],
  ["Laravel"],
  ["GraphQL"],
  ["REST", "rest api", "restful", "rest apis"],
  ["gRPC"],
  ["Microservices", "micro services"],
  // Data & infra
  ["PostgreSQL", "postgres"],
  ["MySQL"],
  ["MongoDB", "mongo"],
  ["Redis"],
  ["Elasticsearch"],
  ["Kafka"],
  ["AWS", "amazon web services"],
  ["Azure"],
  ["GCP", "google cloud"],
  ["Docker"],
  ["Kubernetes", "k8s"],
  ["Terraform"],
  ["Linux"],
  ["Git", "github", "gitlab"],
  ["CI/CD", "ci cd", "continuous integration", "github actions", "jenkins"],
  ["DevOps"],
  // Data / AI
  ["Machine Learning"],
  ["Deep Learning"],
  ["LLM", "llms", "large language models", "generative ai", "genai"],
  ["NLP", "natural language processing"],
  ["PyTorch"],
  ["TensorFlow"],
  ["Pandas"],
  ["NumPy"],
  ["Data Analysis", "data analytics"],
  ["Data Science"],
  ["Data Engineering"],
  ["Spark", "pyspark"],
  ["Airflow"],
  ["dbt"],
  ["Tableau"],
  ["Power BI", "powerbi"],
  ["Excel", "microsoft excel", "ms excel", "advanced excel", "excel spreadsheets", "spreadsheets", "vlookup", "pivot tables", "google sheets"],
  ["Statistics"],
  // Mobile / games / 3D
  ["iOS"],
  ["Android"],
  ["SwiftUI"],
  ["Unity", "unity3d", "unity 3d", "unity engine"],
  ["Unreal Engine", "unreal"],
  ["Roblox"],
  ["Blender"],
  ["3D Modeling", "3d modelling", "3d modeling"],
  // Design
  ["Figma"],
  ["UX", "user experience", "ux design"],
  ["UI Design", "ui/ux", "user interface"],
  ["Product Design"],
  ["Prototyping", "wireframing"],
  ["Adobe Photoshop", "photoshop"],
  ["Illustrator"],
  ["Motion Design", "after effects"],
  // Security / QA
  ["Cybersecurity", "information security", "infosec"],
  ["Penetration Testing", "pentesting"],
  ["QA", "quality assurance"],
  ["Test Automation", "selenium", "cypress", "playwright"],
  ["Jest"],
  ["Unit Testing"],
  // Product / process
  ["Agile"],
  ["Scrum"],
  ["Jira"],
  ["Product Management"],
  ["Project Management", "pmp"],
  ["Roadmapping"],
  ["Stakeholder Management"],
  ["Leadership", "team lead", "mentoring"],
  ["Communication"],
  // Business
  ["SEO", "search engine optimization"],
  ["Content Marketing"],
  ["Copywriting"],
  ["Content Writing", "technical writing"],
  ["Social Media"],
  ["Email Marketing"],
  ["Google Analytics", "ga4"],
  ["Marketing"],
  ["Sales"],
  ["B2B"],
  ["CRM", "salesforce", "hubspot"],
  ["Customer Support", "customer service", "customer success"],
  ["Account Management"],
  ["Recruiting", "talent acquisition"],
  ["Human Resources", "hr"],
  ["Accounting", "bookkeeping"],
  ["Financial Analysis", "financial modeling", "financial modelling"],
  ["Operations"],
  ["Supply Chain", "logistics"],
  ["Teaching", "tutoring"],
  ["Nursing"],
];

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

/**
 * Some skill names are also everyday words ("go to market", "excel in a role", "swift delivery",
 * "express interest", "spring 2026", "unity of purpose"). They need stricter matching so a job
 * isn't credited with (or blamed for missing) a skill it never mentions.
 */
const STRICT: Record<string, { bare?: false; caseSensitive?: true; contexts?: RegExp[]; not?: string }> = {
  // Only "golang", or a capital-G Go used as a language ("in Go", "Go, Python", "Go developer")
  Go: { bare: false, contexts: [/(?:\b(?:in|with|using|and|or)\s+|[,/(:]\s*)Go\b(?!\s+(?:to|for|live|ahead|beyond|through|the|with the))/, /\bGo\s+(?:developer|engineer|programming|language|services|microservices|backend)\b/] },
  // "Excel" the spreadsheet, not "excel in a fast-paced role"
  Excel: { bare: false, contexts: [/(?:[,:/(]|\b(?:and|in|with))\s*Excel\b(?!\s+(?:in|at|as|to|within|under|while))/, /\bExcel\s+(?:skills|spreadsheets?|formulas|macros|proficiency|modell?ing|reporting)\b/] },
  // "express interest" is not Express.js
  Express: { bare: false },
  // "Unity" the engine, not "unity of purpose"
  Unity: { bare: false, contexts: [/(?:[,:/(]|\b(?:and|with|in))\s*Unity\b(?!\s+of)/] },
  Swift: { caseSensitive: true, not: "delivery|response|action|reply|turnaround|growth|resolution|decisions?|execution|movement|learners?|results?" },
  Rust: { caseSensitive: true },
  Ruby: { caseSensitive: true },
  Dart: { caseSensitive: true },
  Scala: { caseSensitive: true },
  Spring: { caseSensitive: true, not: "20\\d\\d|break|season|semester|cleaning|intake|campaign|launch|term" },
  Blender: { caseSensitive: true },
};

const MATCHERS = GROUPS.map(([name, ...aliases]) => {
  const o = STRICT[name];
  const terms = o?.bare === false ? aliases : [name, ...aliases];
  const alts = terms.map((a) => esc(o?.caseSensitive ? a : a.toLowerCase())).join("|");
  const guard = o?.not ? `(?!\\s+(?:${o.not})\\b)` : "";
  const re = alts ? new RegExp(`(?<![a-z0-9+#.])(?:${alts})(?![a-z0-9+#]|\\.[a-z])${guard}`, o?.caseSensitive ? "" : "i") : null;
  const extras = o?.contexts ?? [];
  return { name, test: (t: string) => !!re?.test(t) || extras.some((x) => x.test(t)) };
});

export const ALL_SKILLS = GROUPS.map((g) => g[0]);

/** Returns canonical skill names found in the text, in dictionary order. */
export function findSkills(text: string): string[] {
  return MATCHERS.filter((m) => m.test(text)).map((m) => m.name);
}

/** Skills that imply another: nobody lists "JavaScript" as a gap when their CV says React and TypeScript. */
const IMPLIES: Record<string, string[]> = {
  TypeScript: ["JavaScript"],
  React: ["JavaScript"],
  "Next.js": ["React", "JavaScript"],
  Vue: ["JavaScript"],
  Nuxt: ["Vue", "JavaScript"],
  Angular: ["TypeScript", "JavaScript"],
  Svelte: ["JavaScript"],
  "Node.js": ["JavaScript"],
  Express: ["Node.js", "JavaScript"],
  NestJS: ["Node.js", "TypeScript", "JavaScript"],
  "React Native": ["React", "JavaScript"],
  Redux: ["React", "JavaScript"],
  Tailwind: ["CSS"],
  Sass: ["CSS"],
  Django: ["Python"],
  Flask: ["Python"],
  FastAPI: ["Python"],
  Pandas: ["Python"],
  NumPy: ["Python"],
  PyTorch: ["Python"],
  TensorFlow: ["Python"],
  Rails: ["Ruby"],
  Laravel: ["PHP"],
  Spring: ["Java"],
  SwiftUI: ["Swift", "iOS"],
  PostgreSQL: ["SQL"],
  MySQL: ["SQL"],
  Kubernetes: ["Docker"],
  Terraform: ["DevOps"],
  "Machine Learning": ["Python"],
};

/** A profile's skills plus everything they imply. */
export function expandSkills(skills: string[]): string[] {
  const out = new Set(skills);
  for (const s of skills) for (const i of IMPLIES[s] ?? []) out.add(i);
  return [...out];
}

/** Generic skills that appear in almost every posting; they count for less when scoring. */
export const SOFT_SKILLS = new Set(["Git", "Agile", "Scrum", "Communication", "Leadership", "Excel", "Marketing", "Sales", "Operations", "Jira", "REST", "Linux", "Accessibility", "Stakeholder Management"]);
