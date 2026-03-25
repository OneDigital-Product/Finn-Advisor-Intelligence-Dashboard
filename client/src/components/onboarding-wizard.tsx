import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  Cloud,
  Upload,
  Bot,
  Rocket,
  Sparkles,
  Mail,
  Video,
  TrendingUp,
} from "lucide-react";
const logoImg = "/logo_no_bg.png";

interface StepProps {
  data: WizardData;
  onUpdate: (data: Partial<WizardData>) => void;
}

interface WizardData {
  integrations: Record<string, boolean>;
  clientsImported: number;
  importMethod: string | null;
  aiConfigured: boolean;
}

const defaultData: WizardData = {
  integrations: {
    salesforce: false,
    orion: false,
    outlook: false,
    zoom: false,
  },
  clientsImported: 0,
  importMethod: null,
  aiConfigured: false,
};

const integrationInfo = [
  { key: "salesforce", label: "Salesforce", icon: Cloud, desc: "Sync client accounts, contacts, and activities" },
  { key: "orion", label: "Orion", icon: TrendingUp, desc: "Portfolio data, holdings, and performance metrics" },
  { key: "outlook", label: "Microsoft Outlook", icon: Mail, desc: "Calendar events, email integration" },
  { key: "zoom", label: "Zoom", icon: Video, desc: "Meeting recordings and transcription" },
];

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <Card className="overflow-hidden" data-testid="card-onboarding-welcome">
      <CardContent className="p-8 md:p-12 text-center space-y-6">
        <img src={logoImg} alt="OneDigital" className="h-16 mx-auto" />
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">Welcome to Advisor Suite</h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Get up and running in 5 easy steps. Connect your accounts, import clients, and configure AI to start working smarter.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto pt-4">
          <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50">
            <Cloud className="w-5 h-5 text-primary" />
            <span className="text-sm">Connect</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50">
            <Upload className="w-5 h-5 text-primary" />
            <span className="text-sm">Import</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-sm">Configure</span>
          </div>
        </div>
        <Button size="lg" onClick={onNext} data-testid="button-get-started">
          Get Started
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}

function ConnectStep({ data, onUpdate }: StepProps) {
  const toggleIntegration = (key: string) => {
    onUpdate({
      integrations: {
        ...data.integrations,
        [key]: !data.integrations[key],
      },
    });
  };

  return (
    <Card data-testid="card-onboarding-connect">
      <CardContent className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Connect Accounts</h2>
          <p className="text-muted-foreground mt-1">Select integrations to enable for your practice</p>
        </div>
        <div className="space-y-3">
          {integrationInfo.map((integration) => {
            const connected = data.integrations[integration.key];
            const Icon = integration.icon;
            return (
              <div
                key={integration.key}
                className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${connected ? "border-primary bg-primary/5" : ""}`}
                data-testid={`card-integration-${integration.key}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${connected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">{integration.label}</p>
                    <p className="text-sm text-muted-foreground">{integration.desc}</p>
                  </div>
                </div>
                <Button
                  variant={connected ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleIntegration(integration.key)}
                  data-testid={`button-connect-${integration.key}`}
                >
                  {connected ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Connected
                    </>
                  ) : (
                    "Connect"
                  )}
                </Button>
              </div>
            );
          })}
        </div>
        <p className="text-sm text-muted-foreground">
          You can configure these later from the Settings page.
        </p>
      </CardContent>
    </Card>
  );
}

function ImportStep({ data, onUpdate }: StepProps) {
  const selectMethod = (method: string) => {
    onUpdate({ importMethod: method, clientsImported: method === "skip" ? 0 : 12 });
  };

  return (
    <Card data-testid="card-onboarding-import">
      <CardContent className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Import Clients</h2>
          <p className="text-muted-foreground mt-1">Bring your existing client data into the platform</p>
        </div>
        <div className="space-y-3">
          <button
            className={`w-full text-left p-4 border rounded-lg transition-colors hover:bg-muted/50 ${data.importMethod === "csv" ? "border-primary bg-primary/5" : ""}`}
            onClick={() => selectMethod("csv")}
            data-testid="button-import-csv"
          >
            <div className="flex items-center gap-3">
              <Upload className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">Upload CSV File</p>
                <p className="text-sm text-muted-foreground">Import clients from a spreadsheet template</p>
              </div>
            </div>
          </button>
          {data.integrations.salesforce && (
            <button
              className={`w-full text-left p-4 border rounded-lg transition-colors hover:bg-muted/50 ${data.importMethod === "salesforce" ? "border-primary bg-primary/5" : ""}`}
              onClick={() => selectMethod("salesforce")}
              data-testid="button-import-salesforce"
            >
              <div className="flex items-center gap-3">
                <Cloud className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Import from Salesforce</p>
                  <p className="text-sm text-muted-foreground">Auto-import contacts from your Salesforce account</p>
                </div>
              </div>
            </button>
          )}
          <button
            className={`w-full text-left p-4 border rounded-lg transition-colors hover:bg-muted/50 ${data.importMethod === "skip" ? "border-primary bg-primary/5" : ""}`}
            onClick={() => selectMethod("skip")}
            data-testid="button-import-skip"
          >
            <div className="flex items-center gap-3">
              <Circle className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Skip & Add Manually</p>
                <p className="text-sm text-muted-foreground">Add clients one-by-one from the dashboard</p>
              </div>
            </div>
          </button>
        </div>
        {data.importMethod && data.importMethod !== "skip" && (
          <div className="p-3 bg-muted/50 rounded-lg text-center" data-testid="text-import-count">
            <span className="text-primary font-semibold">{data.clientsImported}</span> clients ready to import
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ConfigureStep({ data, onUpdate }: StepProps) {
  const [testing, setTesting] = useState(false);

  const testConnection = () => {
    setTesting(true);
    setTimeout(() => {
      onUpdate({ aiConfigured: true });
      setTesting(false);
    }, 1500);
  };

  return (
    <Card data-testid="card-onboarding-configure">
      <CardContent className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Configure AI</h2>
          <p className="text-muted-foreground mt-1">Set up AI-powered features for your practice</p>
        </div>
        <div className="space-y-4">
          <div className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              <span className="font-medium">Finn AI Assistant</span>
              {data.aiConfigured && (
                <Badge variant="default" className="ml-auto" data-testid="badge-ai-ready">Ready</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Finn powers meeting prep, client summaries, follow-up emails, and financial diagnostics.
            </p>
            <Button
              variant={data.aiConfigured ? "outline" : "default"}
              onClick={testConnection}
              disabled={testing || data.aiConfigured}
              data-testid="button-verify-ai"
            >
              {testing ? "Verifying..." : data.aiConfigured ? "Connection Verified" : "Verify Connection"}
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="p-3 bg-muted/50 rounded-lg text-center">
              <Sparkles className="w-4 h-4 mx-auto mb-1 text-primary" />
              Meeting Prep
            </div>
            <div className="p-3 bg-muted/50 rounded-lg text-center">
              <Sparkles className="w-4 h-4 mx-auto mb-1 text-primary" />
              Note Summaries
            </div>
            <div className="p-3 bg-muted/50 rounded-lg text-center">
              <Sparkles className="w-4 h-4 mx-auto mb-1 text-primary" />
              Diagnostics
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function GoLiveStep({ data }: StepProps) {
  const router = useRouter();
  const hasIntegration = Object.values(data.integrations).some(Boolean);
  const hasClients = data.clientsImported > 0 || data.importMethod === "skip";

  const completeOnboarding = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/onboarding/complete");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], (old: any) =>
        old ? { ...old, onboardingCompleted: true } : old
      );
      router.push("/");
    },
  });

  const checks = [
    { label: "Account connected", done: hasIntegration, note: hasIntegration ? `${Object.values(data.integrations).filter(Boolean).length} connected` : "No integrations" },
    { label: "Clients imported", done: hasClients, note: data.importMethod === "skip" ? "Manual setup" : `${data.clientsImported} clients` },
    { label: "AI configured", done: data.aiConfigured, note: data.aiConfigured ? "Ready" : "Not configured" },
    { label: "Dashboard accessible", done: true, note: "Ready" },
  ];

  const allDone = checks.every((c) => c.done);

  return (
    <Card data-testid="card-onboarding-golive">
      <CardContent className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Go Live</h2>
          <p className="text-muted-foreground mt-1">Review your setup and start using the platform</p>
        </div>
        <div className="space-y-3">
          {checks.map((check) => (
            <div
              key={check.label}
              className={`flex items-center justify-between p-3 border rounded-lg ${check.done ? "border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30" : "border-muted"}`}
              data-testid={`check-${check.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div className="flex items-center gap-3">
                {check.done ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground" />
                )}
                <span className="font-medium">{check.label}</span>
              </div>
              <span className="text-sm text-muted-foreground">{check.note}</span>
            </div>
          ))}
        </div>
        <div className="text-center pt-2">
          <Button
            size="lg"
            onClick={() => completeOnboarding.mutate()}
            disabled={!allDone || completeOnboarding.isPending}
            className="min-w-48"
            data-testid="button-go-live"
          >
            <Rocket className="w-4 h-4 mr-2" />
            {completeOnboarding.isPending ? "Starting..." : "Start Using Advisor Suite"}
          </Button>
          {!allDone && (
            <p className="text-sm text-muted-foreground mt-2">
              Complete all steps above or skip to continue
            </p>
          )}
          <Button
            variant="ghost"
            className="mt-2"
            onClick={() => completeOnboarding.mutate()}
            disabled={completeOnboarding.isPending}
            data-testid="button-skip-to-dashboard"
          >
            Skip to Dashboard
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const steps = [
  { id: 1, title: "Welcome", icon: Sparkles },
  { id: 2, title: "Connect", icon: Cloud },
  { id: 3, title: "Import", icon: Upload },
  { id: 4, title: "Configure", icon: Bot },
  { id: 5, title: "Go Live", icon: Rocket },
];

export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<WizardData>(defaultData);
  const router = useRouter();

  const updateData = (partial: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  };

  const next = () => setCurrentStep((s) => Math.min(s + 1, 5));
  const prev = () => setCurrentStep((s) => Math.max(s - 1, 1));

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6" data-testid="onboarding-wizard">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">
            Step {currentStep} of {steps.length}
          </h3>
          <div className="flex items-center gap-2">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(step.id)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    step.id === currentStep
                      ? "bg-primary text-primary-foreground"
                      : step.id < currentStep
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                  data-testid={`step-indicator-${step.id}`}
                  title={step.title}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              );
            })}
          </div>
        </div>
        <Progress value={(currentStep / steps.length) * 100} data-testid="progress-onboarding" />
      </div>

      {currentStep === 1 && <WelcomeStep onNext={next} />}
      {currentStep === 2 && <ConnectStep data={data} onUpdate={updateData} />}
      {currentStep === 3 && <ImportStep data={data} onUpdate={updateData} />}
      {currentStep === 4 && <ConfigureStep data={data} onUpdate={updateData} />}
      {currentStep === 5 && <GoLiveStep data={data} onUpdate={updateData} />}

      {currentStep > 1 && (
        <div className="flex justify-between">
          <Button variant="outline" onClick={prev} data-testid="button-prev-step">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          {currentStep < 5 && (
            <Button onClick={next} data-testid="button-next-step">
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
