import type { CertificationKey } from './questions';

export interface StudySection {
  title: string;
  content: string;
}

export interface DomainStudy {
  certification: CertificationKey;
  domain: string;
  summary: string;
  sections: StudySection[];
}

export function studyContentForCert(cert: CertificationKey): DomainStudy[] {
  return STUDY_CONTENT.filter(d => d.certification === cert);
}

export const STUDY_CONTENT: DomainStudy[] = [
  {
    certification: 'AZ-900',
    domain: 'Cloud Service Models',
    summary: 'IaaS, PaaS, and SaaS define how much control you have vs. what Microsoft manages.',
    sections: [
      {
        title: 'IaaS – Infrastructure as a Service',
        content: `You manage: OS, middleware, runtime, apps, data.\nMicrosoft manages: servers, storage, networking, virtualization.\n\nExamples: Azure VMs, Azure Virtual Networks\nUse when: you need full control over the OS or run legacy apps.`,
      },
      {
        title: 'PaaS – Platform as a Service',
        content: `You manage: apps and data only.\nMicrosoft manages: everything below the app layer.\n\nExamples: Azure App Service, Azure SQL Database, Azure Functions\nUse when: you want to focus on app development without managing the underlying platform.`,
      },
      {
        title: 'SaaS – Software as a Service',
        content: `You manage: just your data and user access.\nMicrosoft manages: everything.\n\nExamples: Microsoft 365, Dynamics 365, Azure DevOps\nUse when: you need ready-to-use applications.`,
      },
      {
        title: 'Shared Responsibility Model',
        content: `On-premises: YOU manage everything.\nIaaS: Microsoft manages physical infrastructure; you manage OS up.\nPaaS: Microsoft manages platform; you manage apps and data.\nSaaS: Microsoft manages almost everything; you manage data and access.\n\nKey rule: As you move from IaaS → PaaS → SaaS, Microsoft takes on more responsibility.`,
      },
    ],
  },
  {
    certification: 'AZ-900',
    domain: 'Cloud Deployment Models',
    summary: 'Public, Private, and Hybrid clouds define where your resources live.',
    sections: [
      {
        title: 'Public Cloud',
        content: `Owned and operated by a third-party cloud provider (e.g., Microsoft Azure).\nResources are shared across multiple organizations (multi-tenant).\nPay-as-you-go pricing. No upfront capital costs.\n\nAdvantages: High scalability, no maintenance, global reach.`,
      },
      {
        title: 'Private Cloud',
        content: `Cloud infrastructure operated solely for one organization.\nCan be on-premises or hosted by a provider.\nProvides more control and security.\n\nAdvantages: More control, better security/compliance.\nDisadvantages: Higher cost, less scalability than public cloud.`,
      },
      {
        title: 'Hybrid Cloud',
        content: `Combines public and private clouds, connected via VPN or ExpressRoute.\nData can move between them based on needs.\n\nUse cases: Keep sensitive data on-premises while using public cloud for burst capacity.\nBest of both worlds: control + scalability.`,
      },
      {
        title: 'Key Benefits of Cloud',
        content: `High Availability: services stay up with uptime guarantees (SLA).\nScalability: scale up (more resources) or scale out (more instances).\nElasticity: automatically scale based on demand.\nAgility: deploy resources quickly.\nGeo-distribution: deploy globally, close to users.\nDisaster Recovery: backup and recovery services.\nCapEx → OpEx: pay for what you use, no upfront hardware.`,
      },
    ],
  },
  {
    certification: 'AZ-900',
    domain: 'Azure Architecture',
    summary: 'Azure is organized into geographies, regions, availability zones, and resource containers.',
    sections: [
      {
        title: 'Regions',
        content: `A region is a set of datacenters connected by a low-latency network.\nAzure has 60+ regions worldwide.\nYou choose a region when deploying resources.\n\nSpecial regions: Azure Government, Azure China (operated by 21Vianet).`,
      },
      {
        title: 'Availability Zones',
        content: `Physically separate locations within a region.\nEach zone has independent power, cooling, and networking.\nProtect against datacenter-level failures.\nNot all regions support AZs.\n\nFor VMs: Deploy across 3 AZs for high availability within a region.`,
      },
      {
        title: 'Region Pairs',
        content: `Each region is paired with another region at least 300 miles away.\nUsed for geo-redundant storage and disaster recovery.\nMicrosoft updates paired regions sequentially (not simultaneously).\n\nExample pairs: East US ↔ West US, North Europe ↔ West Europe.`,
      },
      {
        title: 'Resource Hierarchy',
        content: `Management Groups (top level)\n  └── Subscriptions\n        └── Resource Groups\n              └── Resources\n\nManagement Groups: Organize multiple subscriptions, apply policy at scale.\nSubscriptions: Billing boundary + access control boundary.\nResource Groups: Logical containers for related resources. Region-agnostic (resources inside can be in different regions).\nResources: Individual services (VM, storage account, etc.)`,
      },
      {
        title: 'Availability Sets',
        content: `Protect VMs from planned and unplanned downtime within a datacenter.\nFault domains: separate power/networking (up to 3).\nUpdate domains: separate VMs during maintenance (up to 20).\n\nNote: Availability Sets ≠ Availability Zones. Sets are within ONE datacenter; Zones are between datacenters.`,
      },
    ],
  },
  {
    certification: 'AZ-900',
    domain: 'Azure Compute',
    summary: 'Azure offers VMs, containers, serverless, and managed app platforms.',
    sections: [
      {
        title: 'Azure Virtual Machines',
        content: `IaaS offering — full control over OS.\nSupports Windows and Linux.\nUse cases: Lift-and-shift migrations, custom software, full OS control.\n\nVM Scale Sets: Deploy and manage a set of identical VMs that auto-scale.\nAvailability Sets: Protect VMs from hardware failures within a datacenter.`,
      },
      {
        title: 'Azure App Service',
        content: `PaaS for hosting web apps, REST APIs, and mobile backends.\nSupports: .NET, Java, Node.js, Python, PHP, Ruby.\nAuto-scales, high availability, DevOps integration built-in.\n\nNo need to manage the underlying infrastructure.`,
      },
      {
        title: 'Azure Functions',
        content: `Serverless compute — run code triggered by events.\nPay only when code runs (consumption plan).\nTriggers: HTTP, timers, queues, blob changes.\n\nBest for: event-driven workloads, short-running tasks, microservices.`,
      },
      {
        title: 'Azure Container Instances (ACI)',
        content: `Run containers without managing VMs or orchestrators.\nFastest way to run a container in Azure.\nGood for: burst workloads, simple isolated containers, batch jobs.`,
      },
      {
        title: 'Azure Kubernetes Service (AKS)',
        content: `Managed Kubernetes cluster.\nMicrosoft manages the control plane; you manage the nodes.\nFor: complex containerized applications requiring orchestration.`,
      },
      {
        title: 'Azure Virtual Desktop',
        content: `Desktop and app virtualization running on Azure.\nAccess Windows desktops from any device.\nSupports multi-session Windows 11/10.`,
      },
    ],
  },
  {
    certification: 'AZ-900',
    domain: 'Azure Storage',
    summary: 'Azure offers multiple storage types with configurable redundancy options.',
    sections: [
      {
        title: 'Storage Account Types',
        content: `Blob Storage: unstructured data (images, videos, backups, logs).\n  - Block blobs: large files\n  - Append blobs: log files\n  - Page blobs: random access (VM disks)\n\nAzure Files: managed file shares (SMB/NFS), supports Azure File Sync.\nQueue Storage: message queuing between apps.\nTable Storage: NoSQL key-value store.`,
      },
      {
        title: 'Redundancy Options',
        content: `LRS (Locally Redundant): 3 copies in ONE datacenter. Cheapest.\nZRS (Zone Redundant): 3 copies across 3 AZs in ONE region.\nGRS (Geo-Redundant): 3 copies local + 3 copies in paired region (6 total). Cannot read secondary by default.\nRA-GRS (Read-Access GRS): same as GRS but CAN read from secondary region.\nGZRS: ZRS + geo-replication.\nRA-GZRS: GZRS with read access to secondary.\n\nKey: If question says "can read from secondary" → RA-GRS or RA-GZRS.`,
      },
      {
        title: 'Access Tiers',
        content: `Hot: frequently accessed data. Higher storage cost, lower access cost.\nCool: infrequently accessed (at least 30 days). Lower storage cost, higher access cost.\nArchive: rarely accessed (at least 180 days). Lowest cost, hours to rehydrate.`,
      },
      {
        title: 'Azure File Sync',
        content: `Synchronize on-premises file servers with Azure Files.\nEnables cloud tiering: less-used files stored in Azure, frequently used kept on-premises.\nCentralize file shares in Azure while keeping local performance.`,
      },
    ],
  },
  {
    certification: 'AZ-900',
    domain: 'Azure Networking',
    summary: 'Azure networking connects resources securely within Azure and to on-premises/internet.',
    sections: [
      {
        title: 'Virtual Network (VNet)',
        content: `Logically isolated network in Azure.\nSubnets divide a VNet into smaller segments.\nBy default, Azure resources in the same VNet can communicate.\nVNet Peering: connect two VNets privately (no public internet, low latency).`,
      },
      {
        title: 'VPN Gateway',
        content: `Connect on-premises network to Azure over the public internet (encrypted).\nSite-to-Site VPN: persistent connection between on-prem and Azure.\nPoint-to-Site VPN: individual client device connects to Azure.\nLower cost than ExpressRoute but uses public internet.`,
      },
      {
        title: 'ExpressRoute',
        content: `Private dedicated connection from on-premises to Azure via a connectivity provider.\nDoes NOT go over the public internet → more reliable, faster, more secure.\nHigher cost than VPN. Used for enterprise/compliance scenarios.`,
      },
      {
        title: 'Load Balancer & Application Gateway',
        content: `Azure Load Balancer: Layer 4 (TCP/UDP) load balancing. Internal or public.\nApplication Gateway: Layer 7 (HTTP/HTTPS) load balancing + WAF.\nAzure Front Door: global HTTP load balancing + CDN + WAF.\nTraffic Manager: DNS-based traffic routing across regions.`,
      },
      {
        title: 'Network Security Group (NSG)',
        content: `Filter network traffic with inbound/outbound security rules.\nApply to subnets or individual NICs.\nRules have: priority, protocol, source/destination, port, action (allow/deny).`,
      },
      {
        title: 'Azure Firewall & DDoS Protection',
        content: `Azure Firewall: managed, stateful firewall as a service. Centralized network security.\nAzure DDoS Protection:\n  - Basic: automatically included for all Azure customers.\n  - Standard: advanced protection with cost guarantees.`,
      },
    ],
  },
  {
    certification: 'AZ-900',
    domain: 'Identity & Access',
    summary: 'Azure uses Microsoft Entra ID (formerly Azure AD) for identity and RBAC for authorization.',
    sections: [
      {
        title: 'Microsoft Entra ID (Azure AD)',
        content: `Cloud-based identity and access management service.\nNOT the same as on-premises Active Directory Domain Services.\nUsed for: authenticating users to Azure, Microsoft 365, SaaS apps.\n\nKey concepts:\n- Tenant: an organization's dedicated instance of Entra ID.\n- Subscription is associated with one tenant.`,
      },
      {
        title: 'Authentication vs. Authorization',
        content: `Authentication: proving who you are (identity verification).\nAuthorization: what you're allowed to do (permissions).\n\nEntra ID handles authentication. RBAC handles authorization.`,
      },
      {
        title: 'Multi-Factor Authentication (MFA)',
        content: `Requires 2+ verification factors:\n1. Something you know (password)\n2. Something you have (phone, authenticator app)\n3. Something you are (fingerprint, face)\n\nSignificantly reduces risk of credential theft.`,
      },
      {
        title: 'Role-Based Access Control (RBAC)',
        content: `Control who has access to Azure resources and what they can do.\nKey roles: Owner, Contributor, Reader, User Access Administrator.\nApplied at: Management Group, Subscription, Resource Group, or Resource level.\nInherited downward: permissions at parent scope apply to child scopes.`,
      },
      {
        title: 'Zero Trust & Conditional Access',
        content: `Zero Trust: "Never trust, always verify" — verify every request.\nAssume breach, use least-privilege access.\n\nConditional Access: grant or block access based on conditions:\n- User location, device state, risk level, app sensitivity.`,
      },
    ],
  },
  {
    certification: 'AZ-900',
    domain: 'Security & Compliance',
    summary: 'Azure offers multiple security tools and meets major compliance standards.',
    sections: [
      {
        title: 'Microsoft Defender for Cloud',
        content: `Formerly Azure Security Center + Azure Defender.\nProvides: security posture management + threat protection.\nSecure Score: measures your current security posture (higher = more secure).\nRecommendations: actionable steps to improve security.\nWorks across Azure, on-premises, and other clouds (multi-cloud).`,
      },
      {
        title: 'Microsoft Sentinel',
        content: `Cloud-native SIEM (Security Information and Event Management) + SOAR.\nCollects security data at cloud scale.\nDetects threats, investigates, and responds automatically.\nIntegrates with third-party tools.`,
      },
      {
        title: 'Azure Key Vault',
        content: `Securely store secrets, keys, and certificates.\nSecrets: passwords, connection strings, API keys.\nKeys: used for encryption (RSA, EC).\nCertificates: SSL/TLS certificates.\nAccess controlled via RBAC + Entra ID.`,
      },
      {
        title: 'Azure Policy & Compliance',
        content: `Azure Policy: enforce organizational rules on Azure resources.\nInitiatives: groups of policies for a goal (e.g., PCI DSS, ISO 27001).\nCompliance score: shows how well you meet assigned policies.\n\nAzure Blueprints: package of policies + RBAC + resource templates for governance.`,
      },
      {
        title: 'Microsoft Trust Center & Compliance',
        content: `Trust Center: portal with information about Microsoft's security, privacy, compliance.\nCompliance Manager: manage compliance posture, assess against regulations.\n\nKey standards Azure meets: ISO 27001, SOC 1/2/3, PCI DSS, HIPAA, GDPR, FedRAMP.`,
      },
    ],
  },
  {
    certification: 'AZ-900',
    domain: 'Cost Management',
    summary: 'Azure has flexible pricing with tools to estimate, track, and optimize costs.',
    sections: [
      {
        title: 'Pricing Model',
        content: `Pay-as-you-go: pay for what you use, no upfront cost.\nReserved Instances: 1-year or 3-year commitment, up to 72% savings vs. pay-as-you-go.\nSpot Instances: use unused capacity at deep discounts (up to 90%), can be evicted.\nHybrid Benefit: use existing Windows Server/SQL Server licenses in Azure.`,
      },
      {
        title: 'Pricing Calculator',
        content: `Tool to estimate costs BEFORE deploying.\nConfigure services and see estimated monthly cost.\nExport estimates to share with stakeholders.\n\nURL: azure.microsoft.com/en-us/pricing/calculator`,
      },
      {
        title: 'Total Cost of Ownership (TCO) Calculator',
        content: `Compare cost of on-premises vs. Azure.\nHelps justify cloud migration to stakeholders.\nInputs your on-premises infrastructure, outputs potential Azure savings.`,
      },
      {
        title: 'Cost Management + Billing',
        content: `Azure Cost Management: monitor, allocate, and optimize cloud spending.\nFeatures: cost analysis, budgets, alerts, recommendations.\nBudgets: set spending limits and get alerted when approaching them.\nAzure Advisor: provides cost-saving recommendations.`,
      },
      {
        title: 'Factors That Affect Cost',
        content: `Resource type: different services have different pricing.\nRegion: prices vary by region.\nBandwidth: data INGRESS to Azure is free. EGRESS (outbound) is charged.\nReservations: commit to 1-3 years for big discounts.\nAzure Hybrid Benefit: use existing on-prem licenses.`,
      },
    ],
  },
  {
    certification: 'AZ-900',
    domain: 'SLA & Support',
    summary: 'Azure SLAs guarantee uptime percentages, and support plans offer different response times.',
    sections: [
      {
        title: 'Service Level Agreements (SLA)',
        content: `An SLA is Microsoft's commitment to uptime and connectivity.\nExpressed as a percentage: 99.9% = 8.76 hrs downtime/year; 99.99% = 52.6 min/year.\n\nIf Microsoft fails to meet the SLA, you receive service credits.\nFree tier services typically have NO SLA.`,
      },
      {
        title: 'Composite SLA',
        content: `When you combine services, multiply their SLAs:\n99.9% × 99.9% = 99.8% composite SLA.\n\nTo IMPROVE composite SLA: add redundancy or parallel paths.\nExample: two VMs in parallel → 1 - (0.001 × 0.001) = 99.9999%`,
      },
      {
        title: 'Support Plans',
        content: `Basic: free, included with all subscriptions. No technical support tickets.\nDeveloper: $29/mo. Business hours support. For dev/test.\nStandard: $100/mo. 24/7 support. For production workloads.\nProfessional Direct: $1000/mo. Faster response + advisory services.\nUnified (formerly Premier): enterprise-level, custom pricing.\n\nKey exam point: Basic does NOT allow you to open support tickets for technical issues.`,
      },
    ],
  },
  {
    certification: 'AZ-900',
    domain: 'Monitoring',
    summary: 'Azure Monitor is the core platform for collecting metrics, logs, and alerts.',
    sections: [
      {
        title: 'Azure Monitor',
        content: `Centralized monitoring service for Azure resources.\nCollects: metrics (numbers over time) and logs (detailed records).\nFeatures: alerts, dashboards, workbooks.\n\nData sources: VMs, containers, applications, infrastructure, custom sources.`,
      },
      {
        title: 'Log Analytics',
        content: `Tool within Azure Monitor for querying and analyzing log data.\nUses KQL (Kusto Query Language) to query logs.\nCan aggregate logs from multiple sources.`,
      },
      {
        title: 'Application Insights',
        content: `APM (Application Performance Monitoring) service within Azure Monitor.\nFor web applications and services.\nTracks: request rates, response times, failure rates, dependency calls.\nSupports: SDK integration, auto-instrumentation.`,
      },
      {
        title: 'Azure Service Health',
        content: `Personalized view of Azure service status.\nShows outages, planned maintenance, and health advisories.\nDifferent from Azure Status (global view) — Service Health shows YOUR resources.\nCan set up alerts for service issues affecting your resources.`,
      },
      {
        title: 'Azure Advisor',
        content: `Free cloud consultant — analyzes your Azure usage and gives recommendations.\nCategories: Reliability, Security, Performance, Cost, Operational Excellence.\nExample: "Resize or shut down underutilized VMs to save costs."`,
      },
    ],
  },
  {
    certification: 'AZ-900',
    domain: 'Governance',
    summary: 'Azure governance tools help enforce policies, organize resources, and control access at scale.',
    sections: [
      {
        title: 'Azure Policy',
        content: `Define, assign, and manage rules (policies) to enforce compliance.\nPolicies can: audit, deny, or auto-remediate non-compliant resources.\nBuilt-in policies available for common scenarios.\n\nInitiatives (Policy Sets): group multiple policies into one assignment.\nCompliance dashboard shows overall compliance score.`,
      },
      {
        title: 'Resource Locks',
        content: `Prevent accidental deletion or modification of resources.\nTwo types:\n- ReadOnly: can read but not modify or delete.\n- Delete (CanNotDelete): can read and modify but cannot delete.\n\nCan apply to: subscription, resource group, or individual resource.\nLocks are inherited by child resources.`,
      },
      {
        title: 'Management Groups',
        content: `Containers for organizing multiple subscriptions.\nApply governance (policies, RBAC) at scale across subscriptions.\nSupports up to 6 levels of hierarchy.\nTop level is the "Root Management Group" (one per tenant).`,
      },
      {
        title: 'Tags',
        content: `Key-value pairs applied to Azure resources for organization.\nUses: cost tracking, grouping resources by project/environment/owner.\nNOT inherited by child resources (unlike RBAC and policies).\nMax 50 tags per resource.`,
      },
      {
        title: 'Azure Blueprints',
        content: `Package together: policies + RBAC + resource templates.\nUsed to set up repeatable, compliant environments.\nBlueprints are versioned and can be assigned to subscriptions.\nDifference from ARM templates: Blueprints maintain the connection to what was deployed.`,
      },
    ],
  },
  {
    certification: 'AZ-900',
    domain: 'General Azure',
    summary: 'Core Azure concepts covering portal, tools, and fundamental services.',
    sections: [
      {
        title: 'Azure Portal & Tools',
        content: `Azure Portal: web-based GUI at portal.azure.com.\nAzure CLI: command-line tool for scripting (cross-platform).\nAzure PowerShell: PowerShell module for managing Azure.\nAzure Cloud Shell: browser-based shell in the portal (bash or PowerShell).\nAzure Mobile App: manage resources from mobile devices.`,
      },
      {
        title: 'ARM Templates & Bicep',
        content: `ARM (Azure Resource Manager): the management layer for all Azure resources.\nARM Templates: JSON files that define infrastructure as code.\nBicep: simpler DSL that compiles to ARM templates.\nInfrastructure as Code (IaC): deploy consistent environments repeatedly.`,
      },
      {
        title: 'Azure Marketplace',
        content: `Online store for finding, trying, and deploying certified apps and services.\nIncludes: VMs, databases, security tools, developer tools.\nPublished by Microsoft and third-party vendors.`,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // AWS Cloud Practitioner (CLF-C02) — 4 official exam domains
  // ═══════════════════════════════════════════════════════════════════════

  {
    certification: 'CLF-C02',
    domain: 'Cloud Concepts',
    summary: 'Six benefits of cloud, the AWS Well-Architected Framework, deployment models, and the shared responsibility model.',
    sections: [
      {
        title: 'Six Benefits of the Cloud',
        content: `1. Trade capital expense for variable expense (pay-as-you-go, no upfront hardware).
2. Benefit from massive economies of scale — AWS aggregates demand and passes savings on to customers.
3. Stop guessing capacity — scale up or down on demand, avoid over/under-provisioning.
4. Increase speed and agility — spin up new resources in minutes instead of weeks.
5. Stop spending money running data centers — focus on customers, not on server rooms.
6. Go global in minutes — deploy applications in multiple AWS Regions with a few clicks.`,
      },
      {
        title: 'AWS Well-Architected Framework',
        content: `A set of best practices organized into six pillars for designing cloud workloads:

1. Operational Excellence — run and monitor systems to deliver business value.
2. Security — protect information, systems, and assets.
3. Reliability — ensure a workload performs its intended function correctly and consistently.
4. Performance Efficiency — use compute resources efficiently.
5. Cost Optimization — avoid unnecessary costs.
6. Sustainability — minimize environmental impact of running cloud workloads.

Design principle: prefer managed services, automation, and eventual consistency where possible.`,
      },
      {
        title: 'Cloud Deployment Models',
        content: `Cloud: all applications and infrastructure run in AWS.
Hybrid: mix of cloud + on-premises, connected via AWS Direct Connect, VPN, or Storage Gateway. Common for enterprises migrating gradually.
On-premises / Private cloud: traditional data center, sometimes using AWS Outposts to run AWS services locally.

Migration strategies (the "6 Rs"): Rehost (lift-and-shift), Replatform (lift-and-tinker), Repurchase (SaaS), Refactor, Retire, Retain.`,
      },
      {
        title: 'Shared Responsibility Model',
        content: `AWS is responsible for SECURITY OF the cloud:
  · Physical hardware, facilities, networking, hypervisor.
  · Managed services' underlying infrastructure.

Customer is responsible for SECURITY IN the cloud:
  · Guest OS patching (for EC2), application code, data.
  · IAM users/roles/policies.
  · Firewall (security group / NACL) rules.
  · Data encryption keys and their rotation.

The exact split shifts as you move up the stack: EC2 → RDS → Lambda → SaaS. With Lambda, AWS patches the OS; you only own your code and permissions.`,
      },
      {
        title: 'AWS Global Infrastructure',
        content: `Regions: geographically separate areas (e.g., us-east-1). Isolated for fault tolerance and data residency. 30+ Regions worldwide.

Availability Zones (AZs): 3+ isolated data centers per Region. Independent power, cooling, networking; linked by low-latency fiber. Deploy across multiple AZs for high availability.

Edge Locations: 400+ points of presence used by CloudFront and Route 53 for low-latency content delivery, closer to end users than Regions.

Local Zones / Wavelength / Outposts: extend AWS to specific cities, telco 5G networks, or on-prem data centers.`,
      },
      {
        title: 'Cloud Economics — CapEx vs. OpEx',
        content: `Capital Expenditure (CapEx): upfront purchase of long-lived assets (servers, licenses, real estate). Depreciates over years. Traditional data-center model.

Operational Expenditure (OpEx): ongoing usage-based cost (electricity, subscriptions, cloud usage). Deducted in the period incurred.

AWS shifts most spend from CapEx to OpEx: no hardware to buy, no depreciation, cost scales with usage. Combined with Reserved Instances and Savings Plans you can still commit for discounts.`,
      },
      {
        title: 'AWS Cloud Adoption Framework (CAF)',
        content: `Guidance for building an AWS Cloud adoption strategy. Six perspectives:

Business — value realization.
People — culture, roles, skills.
Governance — risk & compliance controls.
Platform — architecture, engineering.
Security — protecting data & systems.
Operations — running the workload day-to-day.

Used to identify capability gaps and plan cloud journey.`,
      },
    ],
  },

  {
    certification: 'CLF-C02',
    domain: 'Security & Compliance',
    summary: 'IAM, encryption, security services, compliance, and where AWS vs customer responsibility begins and ends.',
    sections: [
      {
        title: 'IAM — Identity and Access Management',
        content: `IAM controls WHO can do WHAT on WHICH resources.

Users: long-term identity for a person or app. Has credentials (password + optional access keys).
Groups: collection of users; policies attached apply to all members. Cannot log in itself.
Roles: temporary credentials assumed by users, services, or federated identities. No permanent keys.
Policies: JSON documents describing allow/deny for actions on resources.

Best practices:
- Never use the root user for daily work. Lock it away, enable MFA on it.
- Grant least privilege.
- Prefer roles over long-lived access keys, especially for EC2 → other AWS.
- Rotate credentials.
- Enable MFA for all human users.`,
      },
      {
        title: 'Root User & MFA',
        content: `The root user is created when the AWS account is opened. It has UNLIMITED permission — including closing the account and changing billing details.

Right after account creation:
1. Enable MFA on the root user.
2. Create an IAM administrator user for day-to-day admin.
3. Remove root's access keys.
4. Store root credentials in a safe.

MFA options: virtual (Authenticator apps), hardware token, U2F key, SMS (deprecated for root).`,
      },
      {
        title: 'AWS Security Services',
        content: `Amazon GuardDuty — intelligent threat detection using ML on CloudTrail, VPC Flow Logs, DNS logs.

AWS Shield — DDoS protection. Standard (free, always on) protects against common L3/L4 attacks. Advanced (paid) adds L7 protection, cost protection, and access to the DDoS Response Team.

AWS WAF (Web Application Firewall) — filter HTTP(S) traffic to CloudFront, ALB, API Gateway, App Runner. Block SQL injection, XSS, bad bots.

Amazon Inspector — automated vulnerability management for EC2, ECR container images, Lambda.

Amazon Macie — uses ML to discover and classify sensitive data (PII, PHI) in S3.

AWS Network Firewall — managed stateful firewall for VPCs.

AWS Firewall Manager — centrally configure WAF, Shield Advanced, Network Firewall, security groups across accounts.`,
      },
      {
        title: 'Encryption & Key Management',
        content: `AWS KMS (Key Management Service) — managed encryption key service. Integrates with 100+ AWS services. Supports customer-managed and AWS-managed keys.

AWS CloudHSM — hardware security modules for dedicated single-tenant HSMs. Use when you need FIPS 140-2 Level 3 or full custody of keys.

AWS Secrets Manager — stores, rotates database passwords, API keys. Auto-rotates supported credential types.

AWS Systems Manager Parameter Store — hierarchical key-value store for config and secrets. Cheaper than Secrets Manager but no automatic rotation.

Encryption in transit: TLS everywhere (ALB, API Gateway, S3).
Encryption at rest: S3 (SSE-S3/SSE-KMS/SSE-C), EBS, RDS all support encryption with KMS keys.`,
      },
      {
        title: 'Compliance & Attestations',
        content: `AWS Artifact — self-service portal to download compliance reports (SOC 1/2/3, ISO 27001, PCI DSS, etc.) and agreements (BAA, HIPAA).

AWS Compliance Programs — 140+ certifications and attestations, including HIPAA, PCI DSS, FedRAMP, ISO, GDPR, SOX.

AWS Config — records resource configurations and evaluates them against compliance rules. Detects drift.

AWS Audit Manager — automates evidence collection for compliance audits.

AWS Security Hub — aggregates alerts from GuardDuty, Inspector, Macie, third-party partners and compares against standards (CIS AWS Foundations, PCI DSS, AWS Foundational Security Best Practices).`,
      },
      {
        title: 'Detective & Governance Tools',
        content: `AWS CloudTrail — records every API call made in the account (who did what, when, from where). Enabled by default for management events.

Amazon CloudWatch — metrics, logs, and alarms. Detects operational and security incidents from logs.

AWS Trusted Advisor — inspects account and provides recommendations across cost optimization, performance, security, fault tolerance, service limits.

Amazon Detective — investigates security findings using ML and graph analysis.

Root user & billing anomalies — Trusted Advisor and CloudTrail work together to flag unusual API calls (e.g., root usage, unauthorized region activity).`,
      },
      {
        title: 'Penetration Testing & Abuse Reporting',
        content: `AWS allows customer-initiated penetration testing on your own resources for eight services (EC2, RDS, CloudFront, Aurora, API Gateway, Lambda, Lightsail, Elastic Beanstalk) WITHOUT prior approval, provided you follow their guidelines.

Denial-of-service, port flooding, DNS zone walking against AWS itself are prohibited.

Report abuse originating from AWS resources (spam, DDoS, malware) via the AWS Trust & Safety team.`,
      },
    ],
  },

  {
    certification: 'CLF-C02',
    domain: 'Cloud Technology & Services',
    summary: 'AWS compute, storage, database, networking, migration, and management services.',
    sections: [
      {
        title: 'Compute Services',
        content: `Amazon EC2 — virtual machines. Instance families for compute-, memory-, storage-, or GPU-intensive workloads. Purchasing options: On-Demand, Reserved, Savings Plans, Spot, Dedicated Hosts/Instances.

AWS Lambda — serverless functions. Pay per invocation + execution time. Max 15 min run time. Event-driven (S3, DynamoDB Streams, SQS, API Gateway, EventBridge).

Amazon ECS / EKS / Fargate — container orchestration. ECS = AWS-native, EKS = managed Kubernetes, Fargate = serverless containers (no EC2 to manage).

AWS Elastic Beanstalk — PaaS. Upload code (Node, Python, .NET, Java, Ruby, PHP, Go, Docker); it provisions EC2, ELB, Auto Scaling, RDS automatically.

Amazon Lightsail — simple VPS with predictable monthly pricing. Good for simple apps, WordPress, small websites.

AWS Batch — run large-scale batch jobs on managed EC2/Fargate infrastructure.

AWS Outposts — AWS hardware installed in your data center, running managed AWS services locally.

AWS Wavelength / Local Zones — AWS compute at the edge for ultra-low-latency use cases (5G, gaming).`,
      },
      {
        title: 'Storage Services',
        content: `Amazon S3 — object storage. 11 nines durability, virtually unlimited. Storage classes: Standard, Intelligent-Tiering, Standard-IA, One Zone-IA, Glacier Instant / Flexible / Deep Archive. Static website hosting, cross-region replication, lifecycle policies.

Amazon EBS — block storage attached to EC2 instances. gp3/gp2 (general purpose SSD), io1/io2 (provisioned IOPS SSD), st1 (throughput HDD), sc1 (cold HDD). Snapshots stored in S3.

Amazon EFS — POSIX-compliant NFS file system, shared across many EC2 instances and containers. Auto-scales.

Amazon FSx — managed Windows File Server, Lustre (HPC), NetApp ONTAP, OpenZFS.

AWS Storage Gateway — hybrid storage: File / Volume / Tape gateway. Connects on-prem to S3, EBS, Glacier.

AWS Snow Family — physical devices for offline data transfer: Snowcone (small, edge), Snowball Edge (up to 210 TB, edge compute), Snowmobile (exabyte-scale truck).

AWS Backup — centralized backup across EBS, RDS, DynamoDB, EFS, Storage Gateway, etc.`,
      },
      {
        title: 'Database Services',
        content: `Amazon RDS — managed relational databases: MySQL, PostgreSQL, MariaDB, Oracle, SQL Server. AWS handles patching, backups, replication.

Amazon Aurora — AWS's cloud-native MySQL / PostgreSQL-compatible database. 5× faster than MySQL, 3× faster than PostgreSQL. Storage auto-scales to 128 TB.

Amazon DynamoDB — serverless NoSQL key-value + document database. Single-digit-ms latency, virtually unlimited scale.

Amazon Redshift — petabyte-scale data warehouse. Columnar, MPP. Redshift Serverless available.

Amazon ElastiCache — managed Redis or Memcached (in-memory cache).

Amazon DocumentDB — MongoDB-compatible document database.

Amazon Neptune — graph database (social, fraud, recommendation).

Amazon Timestream — time-series database (IoT, telemetry).

Amazon QLDB — ledger database with immutable, verifiable transaction log.

Amazon Keyspaces — managed Apache Cassandra-compatible database.`,
      },
      {
        title: 'Networking & Content Delivery',
        content: `Amazon VPC — logically isolated virtual network in AWS. Configure subnets (public/private), route tables, NAT gateways, security groups, network ACLs.

Amazon Route 53 — DNS + domain registration + health checks + traffic routing policies (simple, weighted, latency, geolocation, failover, multi-value).

Amazon CloudFront — global CDN. Edge caches static and dynamic content. Integrates with S3, ALB, custom origins, and Lambda@Edge / CloudFront Functions.

Elastic Load Balancing — ALB (HTTP/HTTPS), NLB (TCP/UDP, extreme performance), Gateway LB (traffic to third-party appliances). Cross-AZ.

AWS Direct Connect — dedicated network circuit from on-prem to AWS. Predictable performance, lower cost than heavy VPN.

AWS Site-to-Site VPN — encrypted tunnel over the internet between on-prem and VPC.

AWS Transit Gateway — hub to connect thousands of VPCs and on-prem networks.

AWS Global Accelerator — uses AWS backbone to route users to nearest healthy endpoint. Different from CloudFront (network-layer accelerator, not caching).

Amazon API Gateway — managed REST, HTTP, or WebSocket APIs. Throttling, authentication, caching.`,
      },
      {
        title: 'Application Integration & Messaging',
        content: `Amazon SQS (Simple Queue Service) — fully managed message queue. Standard (at-least-once, best-effort ordering) and FIFO (exactly-once, ordered).

Amazon SNS (Simple Notification Service) — pub/sub. Fan-out to email, SMS, HTTP, Lambda, SQS.

Amazon EventBridge — serverless event bus. Route events from AWS services, SaaS apps, custom code. Schema registry included.

AWS Step Functions — visual workflows across Lambda, EC2, ECS, on-prem tasks. State machines with retries, parallelism, error handling.

Amazon MQ — managed ActiveMQ / RabbitMQ (for lift-and-shift of existing message brokers).

Amazon AppFlow — no-code data transfer between SaaS apps and AWS.

Amazon Kinesis — real-time streaming: Data Streams, Data Firehose, Data Analytics, Video Streams.`,
      },
      {
        title: 'Deployment, DevOps & Monitoring',
        content: `AWS CloudFormation — Infrastructure as Code. YAML/JSON templates describe resources; CloudFormation provisions them idempotently.

AWS CDK (Cloud Development Kit) — define infrastructure in TypeScript, Python, Java, C#. Compiles to CloudFormation.

AWS CodeCommit / CodeBuild / CodeDeploy / CodePipeline — end-to-end CI/CD: Git repo → build → deploy → pipeline orchestration.

Amazon CloudWatch — metrics, logs, alarms, dashboards, Container Insights, Application Insights.

AWS CloudTrail — API audit log.

AWS X-Ray — distributed tracing across microservices.

AWS Systems Manager — patch management, Session Manager (SSH replacement), Run Command, State Manager, Parameter Store.

AWS OpsWorks — managed Chef & Puppet.

AWS Config — resource configuration tracking + compliance rules.`,
      },
      {
        title: 'Migration & Transfer',
        content: `AWS Migration Hub — track migration progress across tools.

AWS Application Migration Service (MGN) — lift-and-shift servers to EC2. Replaces the older SMS.

AWS Database Migration Service (DMS) — migrate databases with minimal downtime. Can also convert schemas (using Schema Conversion Tool).

AWS DataSync — accelerated online data transfer from on-prem NFS/SMB/HDFS to S3, EFS, FSx.

AWS Transfer Family — SFTP, FTPS, FTP, AS2 servers backed by S3 and EFS.

Snow Family — offline transfer (see Storage).

AWS Application Discovery Service — inventory on-prem apps and dependencies before migration.`,
      },
      {
        title: 'Analytics, ML & IoT (at a high level)',
        content: `Athena — serverless SQL over S3 (Presto).
Amazon EMR — managed Hadoop / Spark / Hive / Presto clusters.
AWS Glue — serverless ETL + data catalog.
Amazon QuickSight — BI dashboards.
Amazon OpenSearch Service — managed Elasticsearch/OpenSearch.

SageMaker — build, train, deploy ML models.
Comprehend (NLP), Rekognition (image/video), Polly (text-to-speech), Transcribe, Translate, Textract, Lex (chatbot), Personalize.

IoT Core — connect and manage IoT devices.
IoT Greengrass — run local compute/messaging on IoT devices.

You are not expected to configure these for CLF-C02 — just know what problem each solves.`,
      },
    ],
  },

  {
    certification: 'CLF-C02',
    domain: 'Billing, Pricing & Support',
    summary: 'AWS pricing models, cost tools, billing accounts, and the four support plans.',
    sections: [
      {
        title: 'Fundamental Pricing Principles',
        content: `You pay for what you use. Three fundamental drivers:
1. Compute — per-hour or per-second charges for EC2, RDS, ECS, etc.
2. Storage — per-GB-month for S3, EBS, EFS, backups.
3. Data transfer OUT — data leaving AWS to the internet or between Regions. Data IN is generally free.

Free services / features: VPC itself, IAM, CloudFormation, Elastic Beanstalk (pay for underlying resources), Consolidated Billing.

AWS Pricing Calculator — estimate monthly costs before you deploy.`,
      },
      {
        title: 'EC2 Purchase Options',
        content: `On-Demand — pay per second, no commitment. Use for short-term or unpredictable workloads.

Reserved Instances (RI) — 1 or 3-year commitment for up to 72% discount. Standard (best discount, less flexible) or Convertible (change instance family). Payment: no / partial / all upfront.

Savings Plans — flexible discount for 1 or 3-year commitment to a $/hour spend. Compute Savings Plan covers EC2, Fargate, Lambda across regions. EC2 Savings Plan is region- and family-specific but higher discount.

Spot Instances — spare capacity at up to 90% discount. AWS may reclaim with 2-minute warning. Ideal for fault-tolerant, stateless batch, big-data workloads.

Dedicated Hosts / Instances — physical server or isolated hardware for BYOL, compliance.

Capacity Reservations — reserve capacity in a specific AZ without long-term commitment or discount.`,
      },
      {
        title: 'AWS Free Tier',
        content: `Always Free — never expires (limited amounts). Examples:
  · 1 million Lambda requests/month.
  · 25 GB DynamoDB storage.
  · 10 custom Amazon CloudWatch metrics.

12-Month Free — for new accounts, first year only. Examples:
  · 750 hours/month of EC2 t2.micro or t3.micro.
  · 5 GB S3 Standard storage.
  · 750 hours/month RDS db.t2.micro / db.t3.micro.

Short-term Trials — vary by service (e.g., 2 months of Redshift).

You still pay for anything beyond the free-tier limits.`,
      },
      {
        title: 'Cost Management Tools',
        content: `AWS Billing Dashboard — main billing home. See month-to-date spend and estimated bill.

AWS Cost Explorer — visualize spend, forecast, break down by service, tag, account, region. Up to 12 months of history.

AWS Budgets — alert (SNS/email) when actual or forecasted spend/usage exceeds threshold. Also supports Reserved Instance and Savings Plans utilization/coverage budgets.

AWS Cost and Usage Report (CUR) — most detailed spend data delivered to S3, queryable in Athena / QuickSight.

AWS Cost Anomaly Detection — ML-based alerts when spend deviates from expected pattern.

AWS Compute Optimizer — recommends right-sizing for EC2, EBS, Lambda, Auto Scaling groups.

AWS Pricing Calculator — pre-deployment cost estimates.`,
      },
      {
        title: 'AWS Organizations & Consolidated Billing',
        content: `AWS Organizations — group multiple AWS accounts. Central management: policies (SCPs), consolidated billing, cross-account trust.

Consolidated Billing — one bill for all accounts in the org. Volume discounts (S3, EC2) aggregate across accounts. Reserved Instance and Savings Plan discounts share across accounts automatically.

Service Control Policies (SCPs) — organization-wide guardrails on what actions accounts / OUs can perform (deny-list style). Don't grant permissions; they restrict them.

AWS Control Tower — set up a multi-account "landing zone" with best-practice defaults built on Organizations + Config + CloudTrail + Service Catalog.

Cross-account roles — one account assumes an IAM role in another account for secure access.`,
      },
      {
        title: 'AWS Support Plans',
        content: `AWS offers four support plans; all include 24×7 access to customer service, documentation, whitepapers, forums, and Personal Health Dashboard.

Basic (free) — account & billing support only. Trusted Advisor: 6 core checks. No technical support.

Developer (~$29/mo) — email-only tech support during business hours. Best practice guidance. Client-side diagnostic tools. One primary contact.

Business (~$100/mo minimum) — 24×7 phone/chat/email tech support. Trusted Advisor: full checks. AWS Support API. Unlimited contacts. Third-party software support. Response SLAs: < 1 h production down, < 4 h impaired.

Enterprise On-Ramp (~$5,500/mo) — Business features + Concierge team (pooled TAM), Well-Architected reviews, response < 30 min for business-critical outages, Cost Optimization workshops.

Enterprise (~$15,000/mo) — dedicated Technical Account Manager (TAM), Infrastructure Event Management, response < 15 min for business-critical, Well-Architected reviews, best-practice reviews, tooling access. For mission-critical workloads.`,
      },
      {
        title: 'Trusted Advisor, Health Dashboard & Others',
        content: `AWS Trusted Advisor — automated inspector across five pillars (Cost, Performance, Security, Fault Tolerance, Service Limits). Basic support = 6 core checks; Business/Enterprise = all checks.

AWS Personal Health Dashboard — service events that affect YOUR account (planned changes, degraded performance, security notifications). Different from the public Service Health Dashboard (which shows global outages).

AWS Knowledge Center — searchable Q&A of common issues.

AWS re:Post — community forums (successor to AWS Forums).

AWS Marketplace — buy & deploy third-party software with AWS billing integration. Costs appear on your AWS bill; some purchases count toward EDP / private pricing.

AWS Professional Services & AWS Partner Network (APN) — paid consulting engagements via AWS or certified partners.`,
      },
      {
        title: 'Concierge, TAM, IEM',
        content: `Concierge (Enterprise On-Ramp) — pool of billing / account experts who help with billing, account operations, questions about consolidated billing, RI/SP purchases.

Technical Account Manager (TAM) — dedicated to Enterprise Support customers. Proactive guidance, architectural reviews, launch readiness support, Ops reviews.

Infrastructure Event Management (IEM) — engineered support during major events (Black Friday launch, product go-live, migration cutover). Included with Enterprise; available at additional cost with Business.`,
      },
    ],
  },
];
