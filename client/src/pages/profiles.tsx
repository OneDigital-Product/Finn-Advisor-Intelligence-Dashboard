import { useState } from "react";
import { ProfileList } from "../components/profiles/ProfileList";
import { ProfileEditor } from "../components/profiles/ProfileEditor";
import { VersionHistory } from "../components/profiles/VersionHistory";

export default function ProfilesPage() {
  const [view, setView] = useState<"list" | "editor" | "history">("list");
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  const handleSelectProfile = (profileId: string) => {
    setSelectedProfileId(profileId);
    setView("editor");
  };

  const handleViewHistory = (profileId: string) => {
    setSelectedProfileId(profileId);
    setView("history");
  };

  const handleBack = () => {
    setView("list");
    setSelectedProfileId(null);
  };

  return (
    <div className="p-6">
      {view === "list" && (
        <ProfileList
          onSelectProfile={handleSelectProfile}
          onViewHistory={handleViewHistory}
        />
      )}
      {view === "editor" && selectedProfileId && (
        <ProfileEditor
          profileId={selectedProfileId}
          onBack={handleBack}
          onViewHistory={handleViewHistory}
        />
      )}
      {view === "history" && selectedProfileId && (
        <VersionHistory
          profileId={selectedProfileId}
          onBack={handleBack}
        />
      )}
    </div>
  );
}
