export const SKILL_KEYWORDS: Record<string, string[]> = {
  // DevOps & CI/CD
  "Azure DevOps": ["azure devops", "ado", "azure pipelines"],
  "CI/CD": ["ci/cd", "cicd", "continuous integration", "continuous delivery", "continuous deployment"],
  "YAML Pipelines": ["yaml pipeline", "yaml template", "golden pipeline"],
  Jenkins: ["jenkins"],
  "GitHub Actions": ["github actions", "github workflow"],
  GitLab: ["gitlab", "gitlab ci"],
  ArgoCD: ["argocd", "argo cd", "gitops"],

  // Cloud Platforms
  "Azure Cloud": ["azure cloud", "azure services", "microsoft azure", "azure"],
  AWS: ["aws", "amazon web services", "ec2", "s3", "lambda"],
  GCP: ["gcp", "google cloud", "google cloud platform"],

  // Containers & Orchestration
  Kubernetes: ["kubernetes", "k8s", "aks", "eks", "gke"],
  Docker: ["docker", "container", "containerization", "dockerfile"],
  OpenShift: ["openshift", "red hat openshift"],
  Helm: ["helm chart", "helm"],

  // IaC & Automation
  Terraform: ["terraform"],
  Ansible: ["ansible"],
  Pulumi: ["pulumi"],
  CloudFormation: ["cloudformation"],
  "IaC": ["iac", "infrastructure as code"],

  // Security
  "Security (SAST/SCA/DAST)": ["sast", "sca", "dast", "secret scanning", "devsecops", "security scanning", "appsec", "application security"],
  RBAC: ["rbac", "role-based", "access control"],
  "IAM": ["iam", "identity management", "identity and access"],
  "SOC/SIEM": ["soc", "siem", "security operations", "splunk", "sentinel"],
  "Penetration Testing": ["penetration test", "pentest", "ethical hacking", "vulnerability assessment"],

  // Programming Languages
  Python: ["python"],
  Java: ["java", "spring boot", "spring framework", "jvm"],
  "C#/.NET": ["c#", ".net", "dotnet", "asp.net", ".net core", "csharp"],
  JavaScript: ["javascript", "js", "ecmascript"],
  TypeScript: ["typescript", "ts"],
  Go: ["golang", " go ", "go programming"],
  "C/C++": ["c++", "cpp", "c programming"],
  Rust: ["rust", "rust programming"],
  Ruby: ["ruby", "ruby on rails", "rails"],
  PHP: ["php", "laravel", "symfony"],
  Scala: ["scala"],
  Kotlin: ["kotlin"],
  Swift: ["swift", "ios development"],
  "R": [" r ", "r programming", "rstudio"],
  ABAP: ["abap"],
  PowerShell: ["powershell"],
  Bash: ["bash", "shell script"],

  // Frontend Frameworks
  React: ["react", "reactjs", "react.js", "next.js", "nextjs"],
  Angular: ["angular", "angularjs"],
  "Vue.js": ["vue", "vuejs", "vue.js", "nuxt"],
  Svelte: ["svelte", "sveltekit"],

  // Backend & APIs
  "Node.js": ["node.js", "nodejs", "express.js", "expressjs"],
  "REST API": ["rest api", "restful", "api development", "api design"],
  GraphQL: ["graphql"],
  gRPC: ["grpc"],
  Microservices: ["microservice", "micro-service"],

  // Databases
  PostgreSQL: ["postgresql", "postgres"],
  MySQL: ["mysql", "mariadb"],
  MongoDB: ["mongodb", "mongo"],
  "SQL Server": ["sql server", "mssql", "t-sql"],
  Oracle: ["oracle db", "oracle database", "pl/sql"],
  Redis: ["redis"],
  Elasticsearch: ["elasticsearch", "elastic", "elk stack", "kibana"],
  Cassandra: ["cassandra"],
  DynamoDB: ["dynamodb"],
  CosmosDB: ["cosmosdb", "cosmos db"],

  // SAP
  SAP: ["sap"],
  "SAP HANA": ["sap hana", "hana"],
  "SAP ABAP": ["sap abap"],
  "SAP Fiori": ["sap fiori", "sapui5", "sap ui5"],
  "SAP S/4HANA": ["s/4hana", "s4hana"],
  "SAP BTP": ["sap btp", "sap business technology platform", "sap cloud platform"],
  "SAP Basis": ["sap basis", "sap netweaver"],
  "SAP Security": ["sap security", "sap grc", "sap authorization"],
  "SAP MM/SD": ["sap mm", "sap sd", "sap materials management", "sap sales"],
  "SAP FI/CO": ["sap fi", "sap co", "sap finance", "sap controlling"],
  "SAP PI/PO": ["sap pi", "sap po", "sap integration"],
  "SAP BI/BW": ["sap bi", "sap bw", "sap business warehouse", "sap analytics"],
  "SAP TDM": ["sap tdm", "threat detection", "sap threat", "tdm service"],

  // Data & Analytics
  "Data Engineering": ["data engineer", "data pipeline", "etl", "data warehouse"],
  "Data Science": ["data science", "data scientist", "machine learning", "ml"],
  "AI/ML": ["artificial intelligence", "deep learning", "nlp", "computer vision", "llm", "generative ai"],
  Spark: ["apache spark", "spark", "pyspark"],
  Kafka: ["apache kafka", "kafka"],
  Airflow: ["apache airflow", "airflow"],
  Databricks: ["databricks"],
  Snowflake: ["snowflake"],
  "Power BI": ["power bi", "powerbi"],
  Tableau: ["tableau"],

  // Mobile
  "Mobile Development": ["mobile development", "mobile app"],
  "React Native": ["react native"],
  Flutter: ["flutter", "dart"],
  "iOS": ["ios", "swift", "objective-c", "xcode"],
  Android: ["android", "kotlin android"],

  // Architecture & Methodology
  "Enterprise Architecture": ["enterprise", "architecture", "architect", "platform"],
  "Multi-Tenancy": ["multi-tenant", "multi-tenancy", "isolation", "tenant"],
  "Solution Architecture": ["solution architect", "solution architecture", "technical architect"],
  Agile: ["agile", "scrum", "kanban", "safe", "sprint"],
  Migration: ["migration", "migrate", "cutover", "rollout"],
  Automation: ["automation", "automate", "provisioning"],
  Compliance: ["compliance", "governance", "audit", "policy", "gdpr", "iso 27001"],
  ITIL: ["itil", "itsm", "service management"],

  // Monitoring & Observability
  Prometheus: ["prometheus"],
  Grafana: ["grafana"],
  Datadog: ["datadog"],
  "New Relic": ["new relic"],
  Dynatrace: ["dynatrace"],

  // Version Control
  Git: ["git", "repository", "repo", "branching"],

  // Networking
  Networking: ["networking", "tcp/ip", "dns", "load balancer", "vpn", "firewall", "cdn"],
  Linux: ["linux", "ubuntu", "centos", "rhel", "debian"],

  // ERP & CRM
  Salesforce: ["salesforce", "sfdc", "apex", "soql"],
  ServiceNow: ["servicenow", "snow"],
  Dynamics: ["dynamics 365", "dynamics crm", "d365"],
};

export function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const [skill, keywords] of Object.entries(SKILL_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      found.push(skill);
    }
  }
  return found;
}

export function calculateMatchScore(candidateSkills: string[], jdSkills: string[]): number {
  if (!jdSkills.length) return 0;
  const matched = candidateSkills.filter((s) => jdSkills.includes(s));
  return Math.round((matched.length / jdSkills.length) * 100);
}
