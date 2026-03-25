import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle } from "lucide-react";
import { P, SPRING } from "@/styles/tokens";
import { Serif } from "@/components/design/typography";
const logoImg = "/logo_no_bg.png";

export default function Signup() {
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.toLowerCase().trim().endsWith("@onedigital.com")) {
      setError("Only @onedigital.com email addresses are allowed");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await signup(name, email, password, title || undefined);
    } catch (err: any) {
      const msg = err.message || "Signup failed";
      if (msg.includes("409")) {
        setError("An account with this email already exists");
      } else if (msg.includes("400")) {
        setError("Only @onedigital.com email addresses are allowed");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="grain"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: `linear-gradient(135deg, ${P.odBg} 0%, ${P.odSurf} 50%, ${P.odSurf2} 100%)`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.03,
          backgroundImage:
            "radial-gradient(circle at 25% 25%, white 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div
        className="animate-sc-in"
        style={{
          width: "100%",
          maxWidth: 400,
          background: P.odSurf,
          borderRadius: 10,
          padding: "40px 36px",
          boxShadow: "0 24px 60px rgba(0,0,0,.2), 0 0 0 1px rgba(0,0,0,.05)",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 32,
            justifyContent: "center",
          }}
        >
          <img
            src={logoImg}
            alt="OneDigital"
            style={{ width: 40, height: 40, objectFit: "contain" }}
          />
          <div>
            <Serif
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: P.odT1,
                display: "block",
              }}
              data-testid="text-signup-brand"
            >
              OneDigital
            </Serif>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: ".12em",
                color: P.lt,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Advisor Command Center
            </span>
          </div>
        </div>

        <Serif
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: P.odT1,
            display: "block",
            marginBottom: 4,
            textAlign: "center",
          }}
          data-testid="text-signup-title"
        >
          Create Account
        </Serif>
        <p
          style={{
            fontSize: 12,
            color: P.lt,
            textAlign: "center",
            marginBottom: 24,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Sign up with your @onedigital.com email
        </p>

        <form onSubmit={handleSubmit}>
          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 12px",
                borderRadius: 6,
                background: P.rL,
                color: P.red,
                fontSize: 12,
                fontWeight: 500,
                marginBottom: 16,
                border: `1px solid ${P.red}20`,
              }}
              data-testid="text-signup-error"
            >
              <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />
              {error}
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <Label
              htmlFor="name"
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: P.odT2,
                marginBottom: 6,
                display: "block",
              }}
            >
              Full Name
            </Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              required
              data-testid="input-name"
              style={{
                background: P.odSurf,
                border: `1px solid ${P.odBorder}`,
                borderRadius: 6,
                fontSize: 13,
              }}
              className="focus-border"
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <Label
              htmlFor="email"
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: P.odT2,
                marginBottom: 6,
                display: "block",
              }}
            >
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@onedigital.com"
              required
              data-testid="input-email"
              style={{
                background: P.odSurf,
                border: `1px solid ${P.odBorder}`,
                borderRadius: 6,
                fontSize: 13,
              }}
              className="focus-border"
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <Label
              htmlFor="title"
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: P.odT2,
                marginBottom: 6,
                display: "block",
              }}
            >
              Title <span style={{ color: P.lt, fontWeight: 400 }}>(optional)</span>
            </Label>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Financial Advisor"
              data-testid="input-title"
              style={{
                background: P.odSurf,
                border: `1px solid ${P.odBorder}`,
                borderRadius: 6,
                fontSize: 13,
              }}
              className="focus-border"
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <Label
              htmlFor="password"
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: P.odT2,
                marginBottom: 6,
                display: "block",
              }}
            >
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              data-testid="input-password"
              style={{
                background: P.odSurf,
                border: `1px solid ${P.odBorder}`,
                borderRadius: 6,
                fontSize: 13,
              }}
              className="focus-border"
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <Label
              htmlFor="confirmPassword"
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: P.odT2,
                marginBottom: 6,
                display: "block",
              }}
            >
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
              data-testid="input-confirm-password"
              style={{
                background: P.odSurf,
                border: `1px solid ${P.odBorder}`,
                borderRadius: 6,
                fontSize: 13,
              }}
              className="focus-border"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px 0",
              borderRadius: 6,
              border: "none",
              background: P.odBg,
              color: P.nText,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              transition: `all .2s ${SPRING}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
            data-testid="button-signup"
          >
            {loading && (
              <Loader2
                style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }}
              />
            )}
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p
          style={{
            marginTop: 20,
            textAlign: "center",
            fontSize: 12,
            color: P.lt,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Already have an account?{" "}
          <a
            href="/login"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, "", "/login");
              window.dispatchEvent(new PopStateEvent("popstate"));
            }}
            style={{
              color: P.blue,
              fontWeight: 600,
              textDecoration: "none",
              cursor: "pointer",
            }}
            data-testid="link-signin"
          >
            Sign In
          </a>
        </p>
      </div>
    </div>
  );
}
