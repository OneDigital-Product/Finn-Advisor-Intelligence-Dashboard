import { Card, CardContent } from "@/components/ui/card";
import { IntakeSubmissionForm } from "@/components/cassidy/intake-submission";

export default function IntakePage() {
  return (
    <div className="container max-w-6xl py-6 px-4" data-testid="page-intake">
      <div className="mb-6">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Intake Processing</h1>
        <p className="text-muted-foreground mt-2">Extract structured facts from client meetings and notes</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <IntakeSubmissionForm />
        </div>
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3">How It Works</h3>
              <ol className="text-sm space-y-2.5 text-muted-foreground">
                <li className="flex gap-2">
                  <span className="font-medium text-foreground shrink-0">1.</span>
                  Select the input type (transcript, notes, etc.)
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-foreground shrink-0">2.</span>
                  Choose the associated client
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-foreground shrink-0">3.</span>
                  Paste or type the text content
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-foreground shrink-0">4.</span>
                  Submit for AI extraction
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-foreground shrink-0">5.</span>
                  Review extracted facts with confidence scores
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-foreground shrink-0">6.</span>
                  Approve facts for profile mapping (coming soon)
                </li>
              </ol>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3">Supported Input Types</h3>
              <ul className="text-sm space-y-1.5 text-muted-foreground">
                <li><span className="font-medium text-foreground">Transcript</span> — Full meeting transcriptions</li>
                <li><span className="font-medium text-foreground">Summary</span> — Condensed meeting summaries</li>
                <li><span className="font-medium text-foreground">Dictation</span> — Voice dictation notes</li>
                <li><span className="font-medium text-foreground">Notes</span> — Advisor-written notes</li>
                <li><span className="font-medium text-foreground">CRM Note</span> — Notes from CRM systems</li>
                <li><span className="font-medium text-foreground">Email</span> — Client email correspondence</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
