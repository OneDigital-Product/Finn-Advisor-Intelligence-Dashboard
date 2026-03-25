import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle } from "lucide-react";
import { P, SPRING, EASE } from "@/styles/tokens";
import { Serif } from "@/components/design/typography";
const logoImg = "/logo_no_bg.png";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      const msg = err.message || "Login failed";
      if (msg.includes("401")) {
        setError("Invalid email or password");
      } else if (msg.includes("429") || msg.includes("Too many")) {
        setError("Too many login attempts. Please wait 15 minutes and try again.");
      } else if (msg.includes("500") || msg.includes("503")) {
        setError("Server is temporarily unavailable. Please try again in a moment.");
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
              data-testid="text-login-brand"
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
          data-testid="text-login-title"
        >
          Sign In
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
          Enter your credentials to access the platform
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
              data-testid="text-login-error"
            >
              <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />
              {error}
            </div>
          )}

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
              type="text"
              autoComplete="email"
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

          <div style={{ marginBottom: 20 }}>
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
              placeholder="Enter your password"
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
            data-testid="button-login"
          >
            {loading && (
              <Loader2
                style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }}
              />
            )}
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div
          style={{
            marginTop: 24,
            paddingTop: 16,
            borderTop: `1px solid ${P.odBorder}`,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: P.lt,
              textTransform: "uppercase",
              letterSpacing: ".08em",
            }}
          >
            Demo Accounts
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 6,
              fontSize: 11,
              color: P.odT3,
            }}
          >
            <div>
              <span style={{ fontWeight: 600, color: P.dark }}>Advisor</span>
              <span style={{ marginLeft: 6 }}>sarah.mitchell@onedigital.com</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setEmail("sarah.mitchell@onedigital.com");
                setPassword("advisor123");
              }}
              style={{
                padding: "3px 10px",
                borderRadius: 4,
                border: `1px solid ${P.odBorder}`,
                background: P.odSurf,
                fontSize: 10,
                fontWeight: 600,
                color: P.blue,
                cursor: "pointer",
                transition: `all .15s ${EASE}`,
              }}
              data-testid="button-use-advisor-demo"
            >
              Use
            </button>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 6,
              fontSize: 11,
              color: P.odT3,
            }}
          >
            <div>
              <span style={{ fontWeight: 600, color: P.dark }}>Associate</span>
              <span style={{ marginLeft: 6 }}>james.chen@onedigital.com</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setEmail("james.chen@onedigital.com");
                setPassword("associate123");
              }}
              style={{
                padding: "3px 10px",
                borderRadius: 4,
                border: `1px solid ${P.odBorder}`,
                background: P.odSurf,
                fontSize: 10,
                fontWeight: 600,
                color: P.blue,
                cursor: "pointer",
                transition: `all .15s ${EASE}`,
              }}
              data-testid="button-use-associate-demo"
            >
              Use
            </button>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 6,
              fontSize: 11,
              color: P.odT3,
            }}
          >
            <div>
              <span style={{ fontWeight: 600, color: P.dark }}>SF Advisor</span>
              <span style={{ marginLeft: 6 }}>michael.gouldin@onedigital.com.uat</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setEmail("michael.gouldin@onedigital.com.uat");
                setPassword("admin123");
              }}
              style={{
                padding: "3px 10px",
                borderRadius: 4,
                border: `1px solid ${P.odBorder}`,
                background: P.odSurf,
                fontSize: 10,
                fontWeight: 600,
                color: P.blue,
                cursor: "pointer",
                transition: `all .15s ${EASE}`,
              }}
              data-testid="button-use-sf-advisor-demo"
            >
              Use
            </button>
          </div>
        </div>

        <p
          style={{
            marginTop: 20,
            textAlign: "center",
            fontSize: 12,
            color: P.lt,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Don't have an account?{" "}
          <a
            href="/signup"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, "", "/signup");
              window.dispatchEvent(new PopStateEvent("popstate"));
            }}
            style={{
              color: P.blue,
              fontWeight: 600,
              textDecoration: "none",
              cursor: "pointer",
            }}
            data-testid="link-signup"
          >
            Sign Up
          </a>
        </p>
      </div>
    </div>
  );
}
