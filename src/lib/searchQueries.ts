// LinkedIn X-Ray Search Query Builder
// Generates optimized Google search queries based on ACTUAL JD skills

interface SearchQuery {
  id: string;
  label: string;
  description: string;
  query: string;
  url: string;
}

export interface LocationOption {
  id: string;
  label: string;
  country: string;
  cities: string[];
  linkedinGeoUrn: string; // LinkedIn geo ID for direct search
}

export const LOCATIONS: LocationOption[] = [
  { id: "turkey", label: "Turkiye", country: "Turkey", cities: ["Istanbul", "Ankara", "Izmir"], linkedinGeoUrn: "102105699" },
  { id: "germany", label: "Almanya", country: "Germany", cities: ["Berlin", "Munich", "Frankfurt", "Hamburg"], linkedinGeoUrn: "101282230" },
  { id: "poland", label: "Polonya", country: "Poland", cities: ["Warsaw", "Krakow", "Wroclaw", "Gdansk"], linkedinGeoUrn: "105072130" },
  { id: "romania", label: "Romanya", country: "Romania", cities: ["Bucharest", "Cluj-Napoca", "Timisoara", "Iasi"], linkedinGeoUrn: "106670623" },
  { id: "ukraine", label: "Ukrayna", country: "Ukraine", cities: ["Kyiv", "Lviv", "Kharkiv", "Dnipro"], linkedinGeoUrn: "102264497" },
  { id: "india", label: "Hindistan", country: "India", cities: ["Bangalore", "Hyderabad", "Pune", "Mumbai"], linkedinGeoUrn: "102713980" },
  { id: "portugal", label: "Portekiz", country: "Portugal", cities: ["Lisbon", "Porto", "Braga"], linkedinGeoUrn: "100364837" },
  { id: "spain", label: "Ispanya", country: "Spain", cities: ["Madrid", "Barcelona", "Valencia"], linkedinGeoUrn: "105646813" },
  { id: "bulgaria", label: "Bulgaristan", country: "Bulgaria", cities: ["Sofia", "Plovdiv", "Varna"], linkedinGeoUrn: "105333783" },
  { id: "czech", label: "Cekya", country: "Czech Republic", cities: ["Prague", "Brno", "Ostrava"], linkedinGeoUrn: "104508036" },
  { id: "hungary", label: "Macaristan", country: "Hungary", cities: ["Budapest", "Debrecen", "Szeged"], linkedinGeoUrn: "100288700" },
  { id: "croatia", label: "Hirvatistan", country: "Croatia", cities: ["Zagreb", "Split", "Rijeka"], linkedinGeoUrn: "104688944" },
  { id: "serbia", label: "Sirbistan", country: "Serbia", cities: ["Belgrade", "Novi Sad", "Nis"], linkedinGeoUrn: "101855366" },
  { id: "egypt", label: "Misir", country: "Egypt", cities: ["Cairo", "Alexandria", "Giza"], linkedinGeoUrn: "106155005" },
  { id: "morocco", label: "Fas", country: "Morocco", cities: ["Casablanca", "Rabat", "Marrakech"], linkedinGeoUrn: "102787409" },
  { id: "brazil", label: "Brezilya", country: "Brazil", cities: ["Sao Paulo", "Rio de Janeiro", "Belo Horizonte"], linkedinGeoUrn: "106057199" },
];

// Map skills to LinkedIn-friendly search terms (short, exact)
function skillToSearchTerm(skill: string): string {
  const map: Record<string, string> = {
    "Azure DevOps": '"Azure DevOps"',
    "CI/CD": '"CI/CD"',
    "YAML Pipelines": '"YAML pipeline"',
    Kubernetes: "Kubernetes",
    Docker: "Docker",
    Terraform: "Terraform",
    "Security (SAST/SCA/DAST)": "DevSecOps",
    RBAC: "RBAC",
    "Multi-Tenancy": '"multi-tenant"',
    Git: "Git",
    Ansible: "Ansible",
    Jenkins: "Jenkins",
    "GitHub Actions": '"GitHub Actions"',
    GitLab: "GitLab",
    ArgoCD: "ArgoCD",
    Python: "Python",
    Java: "Java",
    "C#/.NET": '".NET"',
    JavaScript: "JavaScript",
    TypeScript: "TypeScript",
    Go: "Golang",
    "C/C++": '"C++"',
    Rust: "Rust",
    Ruby: "Ruby",
    PHP: "PHP",
    Scala: "Scala",
    Kotlin: "Kotlin",
    Swift: "Swift",
    ABAP: "ABAP",
    PowerShell: "PowerShell",
    Bash: "Bash",
    React: "React",
    Angular: "Angular",
    "Vue.js": "Vue.js",
    "Node.js": "Node.js",
    "REST API": '"REST API"',
    GraphQL: "GraphQL",
    Microservices: "microservices",
    PostgreSQL: "PostgreSQL",
    MySQL: "MySQL",
    MongoDB: "MongoDB",
    "SQL Server": '"SQL Server"',
    Oracle: "Oracle",
    Redis: "Redis",
    Elasticsearch: "Elasticsearch",
    SAP: "SAP",
    "SAP HANA": '"SAP HANA"',
    "SAP ABAP": '"SAP ABAP"',
    "SAP Fiori": '"SAP Fiori"',
    "SAP S/4HANA": '"S/4HANA"',
    "SAP BTP": '"SAP BTP"',
    "SAP Basis": '"SAP Basis"',
    "SAP Security": '"SAP Security"',
    "SAP MM/SD": '"SAP MM" OR "SAP SD"',
    "SAP FI/CO": '"SAP FI" OR "SAP CO"',
    "SAP PI/PO": '"SAP PI" OR "SAP PO"',
    "SAP BI/BW": '"SAP BW" OR "SAP BI"',
    "SAP TDM": '"SAP TDM"',
    "Data Engineering": '"data engineer"',
    "Data Science": '"data scientist"',
    "AI/ML": '"machine learning"',
    Spark: "Spark",
    Kafka: "Kafka",
    Airflow: "Airflow",
    Databricks: "Databricks",
    Snowflake: "Snowflake",
    "Power BI": '"Power BI"',
    Tableau: "Tableau",
    "Mobile Development": '"mobile developer"',
    "React Native": '"React Native"',
    Flutter: "Flutter",
    "Azure Cloud": '"Microsoft Azure"',
    AWS: "AWS",
    GCP: '"Google Cloud"',
    "Enterprise Architecture": '"enterprise architect"',
    "Solution Architecture": '"solution architect"',
    Agile: "Agile",
    Migration: "migration",
    Automation: "automation",
    Compliance: "compliance",
    ITIL: "ITIL",
    Prometheus: "Prometheus",
    Grafana: "Grafana",
    Datadog: "Datadog",
    "New Relic": '"New Relic"',
    Dynatrace: "Dynatrace",
    OpenShift: "OpenShift",
    Helm: "Helm",
    Linux: "Linux",
    Networking: "networking",
    Salesforce: "Salesforce",
    ServiceNow: "ServiceNow",
    Dynamics: '"Dynamics 365"',
    IAM: "IAM",
    "SOC/SIEM": "SIEM",
    "Penetration Testing": '"penetration test"',
    IaC: '"infrastructure as code"',
    Pulumi: "Pulumi",
    CloudFormation: "CloudFormation",
    DynamoDB: "DynamoDB",
    CosmosDB: "CosmosDB",
    Cassandra: "Cassandra",
    gRPC: "gRPC",
    Svelte: "Svelte",
    iOS: "iOS",
    Android: "Android",
    "R": "R programming",
  };
  return map[skill] || `"${skill}"`;
}

function buildGoogleUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

export function generateSearchQueries(
  jdSkills: string[],
  selectedLocations: string[] // location IDs
): SearchQuery[] {
  if (jdSkills.length === 0) return [];

  const queries: SearchQuery[] = [];
  const baseLinkedin = "site:linkedin.com/in";

  // Get locations
  const locations = selectedLocations
    .map((id) => LOCATIONS.find((l) => l.id === id))
    .filter(Boolean) as LocationOption[];

  if (locations.length === 0) return [];

  const countryStr = locations.map((l) => `"${l.country}"`).join(" OR ");
  const allCities = locations.flatMap((l) => l.cities);
  const cityStr = allCities.slice(0, 6).map((c) => `"${c}"`).join(" OR ");
  const geoUrns = locations.map((l) => l.linkedinGeoUrn);

  // Primary search terms from JD skills (top 4)
  const primaryTerms = jdSkills.slice(0, 4).map(skillToSearchTerm);
  // Secondary terms
  const secondaryTerms = jdSkills.slice(4, 8).map(skillToSearchTerm);

  // --- Query 1: All primary skills + countries ---
  queries.push({
    id: "primary-country",
    label: "Ana Beceriler + Ulke",
    description: `${jdSkills.slice(0, 4).join(", ")} - ${locations.map((l) => l.label).join(", ")}`,
    query: `${baseLinkedin} ${primaryTerms.join(" ")} (${countryStr})`,
    url: buildGoogleUrl(`${baseLinkedin} ${primaryTerms.join(" ")} (${countryStr})`),
  });

  // --- Query 2: Primary skills + cities ---
  queries.push({
    id: "primary-cities",
    label: "Ana Beceriler + Sehirler",
    description: `${allCities.slice(0, 4).join(", ")} sehirlerinde`,
    query: `${baseLinkedin} ${primaryTerms.slice(0, 3).join(" ")} (${cityStr})`,
    url: buildGoogleUrl(`${baseLinkedin} ${primaryTerms.slice(0, 3).join(" ")} (${cityStr})`),
  });

  // --- Query 3: Secondary skills if available ---
  if (secondaryTerms.length >= 2) {
    queries.push({
      id: "secondary-skills",
      label: "Ek Beceriler",
      description: `${jdSkills.slice(4, 8).join(", ")}`,
      query: `${baseLinkedin} ${secondaryTerms.slice(0, 3).join(" ")} (${countryStr})`,
      url: buildGoogleUrl(`${baseLinkedin} ${secondaryTerms.slice(0, 3).join(" ")} (${countryStr})`),
    });
  }

  // --- Query 4: Combined top 2 skills + role keywords ---
  const hasDevOps = jdSkills.some((s) => s.includes("DevOps") || s.includes("CI/CD") || s === "Kubernetes" || s === "Docker");
  const hasSAP = jdSkills.some((s) => s.includes("SAP"));
  const hasDev = jdSkills.some((s) => ["Java", "C#/.NET", "Python", "JavaScript", "TypeScript", "React", "Angular", "Node.js", "Go"].includes(s));
  const hasData = jdSkills.some((s) => s.includes("Data") || s === "Spark" || s === "Kafka" || s === "Snowflake" || s === "Databricks");
  const hasSecurity = jdSkills.some((s) => s.includes("Security") || s.includes("SAST") || s === "RBAC" || s.includes("Penetration") || s.includes("SOC"));

  let roleTerms = "";
  let roleLabel = "";
  if (hasSAP) {
    roleTerms = `${primaryTerms[0]} ("consultant" OR "developer" OR "architect" OR "engineer")`;
    roleLabel = "SAP Consultant / Developer / Architect";
  } else if (hasDevOps) {
    roleTerms = `${primaryTerms[0]} ("DevOps engineer" OR "platform engineer" OR "SRE" OR "cloud engineer")`;
    roleLabel = "DevOps / Platform / SRE / Cloud Engineer";
  } else if (hasData) {
    roleTerms = `${primaryTerms[0]} ("data engineer" OR "data scientist" OR "data analyst" OR "analytics")`;
    roleLabel = "Data Engineer / Scientist / Analyst";
  } else if (hasSecurity) {
    roleTerms = `${primaryTerms[0]} ("security engineer" OR "security analyst" OR "pentester" OR "DevSecOps")`;
    roleLabel = "Security Engineer / Analyst / DevSecOps";
  } else if (hasDev) {
    roleTerms = `${primaryTerms[0]} ("software engineer" OR "developer" OR "full stack" OR "backend")`;
    roleLabel = "Software Engineer / Developer";
  } else {
    roleTerms = `${primaryTerms[0]} ("engineer" OR "developer" OR "architect" OR "consultant")`;
    roleLabel = "Engineer / Developer / Architect";
  }

  queries.push({
    id: "role-based",
    label: "Rol Bazli Arama",
    description: roleLabel,
    query: `${baseLinkedin} ${roleTerms} (${countryStr})`,
    url: buildGoogleUrl(`${baseLinkedin} ${roleTerms} (${countryStr})`),
  });

  // --- Query 5: Senior level ---
  queries.push({
    id: "senior-level",
    label: "Senior Seviye",
    description: "Senior, Lead, Principal, Chief roller",
    query: `${baseLinkedin} ${primaryTerms.slice(0, 2).join(" ")} ("senior" OR "lead" OR "principal" OR "chief") (${countryStr})`,
    url: buildGoogleUrl(`${baseLinkedin} ${primaryTerms.slice(0, 2).join(" ")} ("senior" OR "lead" OR "principal" OR "chief") (${countryStr})`),
  });

  // --- Query 6: International/Remote experience ---
  queries.push({
    id: "remote-nearshore",
    label: "Remote / Nearshore Deneyim",
    description: "Remote, nearshore, freelance deneyimli adaylar",
    query: `${baseLinkedin} ${primaryTerms.slice(0, 2).join(" ")} ("remote" OR "nearshore" OR "freelance" OR "contractor") (${countryStr})`,
    url: buildGoogleUrl(`${baseLinkedin} ${primaryTerms.slice(0, 2).join(" ")} ("remote" OR "nearshore" OR "freelance" OR "contractor") (${countryStr})`),
  });

  // --- Query 7: LinkedIn Direct Search ---
  const linkedinKeywords = jdSkills
    .slice(0, 5)
    .map(skillToSearchTerm)
    .map((t) => t.replace(/"/g, ""))
    .join(" ");

  const geoParam = geoUrns.map((g) => `"${g}"`).join(",");

  queries.push({
    id: "linkedin-direct",
    label: "LinkedIn Direkt Arama",
    description: "LinkedIn'in kendi aramasiyla (giris gerektirir)",
    query: linkedinKeywords,
    url: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(linkedinKeywords)}&geoUrn=%5B${geoUrns.join(",")}%5D&origin=FACETED_SEARCH`,
  });

  return queries;
}

export function parseLinkedInUrl(url: string): { isValid: boolean; username?: string } {
  const match = url.match(/linkedin\.com\/in\/([a-zA-Z0-9\-_%]+)/);
  if (match) return { isValid: true, username: decodeURIComponent(match[1]) };
  return { isValid: false };
}
