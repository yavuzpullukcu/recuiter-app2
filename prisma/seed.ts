import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.activity.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.job.deleteMany();

// 1. ADIM: Yavuz'u sistemde bul veya oluştur (Sadece email ile)
  const adminUser = await prisma.user.upsert({
    where: { email: "yavuzpullukcu@gmail.com" },
    update: {},
    create: {
      email: "yavuzpullukcu@gmail.com",
      passwordHash: "seed-dummy-password-hash-123", // İŞTE EKLENEN SON ÇÖZÜM SATIRI
    },
  });

  // 2. ADIM: İlanı oluştur ve doğrudan Yavuz'un ID'sine bağla
  const job = await prisma.job.create({
    data: {
      title: "Senior Azure DevOps Platform Engineer / Architect",
      company: "Enterprise Client (Germany)",
      description: "Design, align, and build an enterprise-ready Azure DevOps (ADO) platform for large customers, with a strong focus on multi-tenancy, security-by-design, and automation. Define and execute migration approaches and validate the platform through pilot implementations.",
      skills: JSON.stringify([
        "Azure DevOps", "CI/CD", "YAML Pipelines", "Kubernetes", "Docker",
        "Terraform", "Security (SAST/SCA/DAST)", "RBAC", "Multi-Tenancy",
        "Git", "Automation", "Enterprise Architecture", "Compliance", "Migration"
      ]),
      location: "Remote",
      startDate: "2026-04-15",
      endDate: "2026-09-30",
      workload: "100%",
      contractType: "Nearshore Contracting",
      status: "active",
      userId: adminUser.id, // HATA 1 ÇÖZÜMÜ
    },
  });

  // Create candidates
  const candidates = [
    {
      name: "Kartal Sahin Agar",
      title: "Chief Engineer (DevOps)",
      company: "Aselsan",
      location: "Ankara",
      linkedin: "https://www.linkedin.com/in/kartal-%C5%9Fahin-a%C4%9Far-567b691a/",
      skills: ["Azure DevOps", "Kubernetes", "Docker", "Terraform", "Ansible", "CI/CD", "Security (SAST/SCA/DAST)", "RBAC", "Enterprise Architecture", "Compliance"],
      experience: 20,
      rating: 5,
      notes: "NATO projesi deneyimi. CEH, ECSA, ISO 27001 sertifikali. Azure DevOps, Kubernetes, Docker, Terraform, Ansible. 20+ yil deneyim. Savunma sanayi enterprise tecrubesi.",
    },
    {
      name: "Coskun Ozdemir",
      title: "Lead Software Architect",
      company: "TUPRAS",
      location: "Turkiye",
      linkedin: "https://www.linkedin.com/in/ozdemircoskun/",
      skills: ["Azure DevOps", "Azure Cloud", "Kubernetes", "CI/CD", "Security (SAST/SCA/DAST)", "Docker", "Enterprise Architecture", "Microservices"],
      experience: 15,
      rating: 5,
      notes: "SonarQube, Fortify, New Relic entegrasyonu. Enterprise mimari. Azure AKS, DevOps/DevSecOps yonetimi.",
    },
    {
      name: "Taylan Bakircioglu",
      title: "Sr. Product Group Manager (DevOps)",
      company: "Burgan Bank Turkiye",
      location: "Istanbul",
      linkedin: "https://www.linkedin.com/in/taylanbakircioglu/",
      skills: ["Azure DevOps", "CI/CD", "Terraform", "AWS", "Azure Cloud", "GCP", "Security (SAST/SCA/DAST)", "Automation", "Enterprise Architecture", "Compliance"],
      experience: 12,
      rating: 4,
      notes: "Enterprise bankacilik DevOps yonetimi. Red Hat Summit konusmacisi. Multi-cloud deneyimi.",
    },
    {
      name: "M. Furkan Bodur",
      title: "Senior DevSecOps & AppSec Engineer",
      company: "Ziraat Teknoloji",
      location: "Istanbul",
      linkedin: "https://www.linkedin.com/in/mahmutfurkanbodur/",
      skills: ["Security (SAST/SCA/DAST)", "CI/CD", "Azure DevOps", "Python", "Automation", "Compliance"],
      experience: 5,
      rating: 4,
      notes: "SAST, DAST, Secure SDLC, penetrasyon testi. Ziraat Finance Group genelinde DevSecOps kulturu.",
    },
    {
      name: "Hakan Yazici",
      title: "AppSec & DevSecOps Coordinator",
      company: "-",
      location: "Turkiye",
      linkedin: "https://www.linkedin.com/in/hakan-yazici/",
      skills: ["Security (SAST/SCA/DAST)", "CI/CD", "Compliance", "Automation", "Azure DevOps"],
      experience: 5,
      rating: 4,
      notes: "Certified DevSecOps Engineer. MSc Information Security. Zafiyet %30+ azaltma basarisi.",
    },
    {
      name: "Vedit Firat Arig",
      title: "Founder / Fellow DevOps Engineer",
      company: "Artifact Systems",
      location: "Istanbul",
      linkedin: "https://www.linkedin.com/in/vedit/",
      skills: ["Azure DevOps", "CI/CD", "Docker", "Kubernetes", "Automation", "Enterprise Architecture", "Git"],
      experience: 10,
      rating: 4,
      notes: "Fellow seviye DevOps muhendisi. wamo, Modanisa, VNGRS deneyimi. MS Information Technologies.",
    },
    {
      name: "Hakki Sagdic",
      title: "MCT / MCSD / Azure Dev / DevOps Engineer",
      company: "-",
      location: "Istanbul",
      linkedin: "https://www.linkedin.com/in/hsag/",
      skills: ["Azure DevOps", "Azure Cloud", "CI/CD", "Docker", "Automation", "Enterprise Architecture", "Git"],
      experience: 12,
      rating: 4,
      notes: "Microsoft Certified Trainer, MCSD. Cloud native uygulamalar. Innersource. Egitim ve enablement yetenegi guclu.",
    },
    {
      name: "Mert Okumus",
      title: "Certified DevOps Engineer & SRE",
      company: "adesso Turkey",
      location: "Turkiye",
      linkedin: "https://www.linkedin.com/in/mert-okumus/",
      skills: ["Terraform", "Kubernetes", "CI/CD", "Azure DevOps", "Docker", "Automation", "Git"],
      experience: 4,
      rating: 3,
      notes: "HashiCorp Terraform Associate, CKAD (%93). adesso Almanya ile calisma deneyimi (nearshore uyumlu).",
    },
    {
      name: "Mustafa Sayilgan",
      title: "DevOps Engineer",
      company: "EPAM Systems",
      location: "Turkiye",
      linkedin: "https://www.linkedin.com/in/mustafa-sayilgan/",
      skills: ["Azure DevOps", "CI/CD", "Docker", "Kubernetes", "Automation", "Git"],
      experience: 5,
      rating: 3,
      notes: "EPAM - uluslararasi nearshore sirket deneyimi. DevOps surecleri.",
    },
    {
      name: "Mesut Ozturk",
      title: "Software Architect",
      company: "KocDigital",
      location: "Turkiye",
      linkedin: "https://www.linkedin.com/in/mesut-ozturk-99384518/",
      skills: ["Azure DevOps", "Azure Cloud", "CI/CD", "Enterprise Architecture", "Microservices", "Agile"],
      experience: 15,
      rating: 4,
      notes: "15+ yil deneyim. Enterprise seviye cozumler. Cloud-based DevOps. Ingilizce yetkin.",
    },
    {
      name: "Enes Turan",
      title: "Cloud/DevOps Engineer",
      company: "IBM",
      location: "Turkiye",
      linkedin: "https://www.linkedin.com/in/devenes/",
      skills: ["Azure DevOps", "Azure Cloud", "CI/CD", "Kubernetes", "Docker", "Automation", "Git"],
      experience: 4,
      rating: 3,
      notes: "IBM deneyimi. Cloud Native Turkey toplulugunda aktif. KCD Turkey konusmacisi.",
    },
    {
      name: "Onurcan Ozavci",
      title: "Senior DevOps Engineer",
      company: "Ziraat Teknoloji",
      location: "Istanbul",
      linkedin: "https://www.linkedin.com/in/onurcan-%C3%B6zavci/",
      skills: ["Kubernetes", "Docker", "CI/CD", "Python", "Git", "Automation"],
      experience: 4,
      rating: 3,
      notes: "Kubernetes cluster yonetimi, CI/CD pipeline. Erasmus programi (AB deneyimi). Enterprise bankacilik.",
    },
    {
      name: "Betul Beyazoglu",
      title: "Senior DevOps Engineer",
      company: "Triumph",
      location: "Turkiye",
      linkedin: "https://www.linkedin.com/in/betulbeyazoglu/",
      skills: ["CI/CD", "Docker", "AWS", "Automation", "Git"],
      experience: 6,
      rating: 3,
      notes: "6+ yil IT deneyimi. Cloud infrastructure. AWS Certified Cloud Practitioner. Dijital donusum.",
    }
  ];

  // 3. ADIM: Adayları ve Aktiviteleri döngüyle oluştururken ID'yi ekle
  for (const c of candidates) {
    const candidate = await prisma.candidate.create({
      data: {
        name: c.name,
        title: c.title,
        company: c.company,
        location: c.location,
        linkedin: c.linkedin,
        skills: JSON.stringify(c.skills),
        experience: c.experience,
        rating: c.rating,
        notes: c.notes,
        status: "new",
        jobId: job.id,
        userId: adminUser.id, // HATA 2 ÇÖZÜMÜ
      },
    });

    await prisma.activity.create({
      data: {
        type: "note",
        content: "Aday eklendi - LinkedIn aramasindan bulundu",
        candidateId: candidate.id,
        userId: adminUser.id, // HATA 3 ÇÖZÜMÜ
      },
    });
  }

  console.log(`Seed completed: 1 job, ${candidates.length} candidates created.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());