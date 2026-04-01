import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../../services/api.js";
import { useAuth } from "../../context/AuthContext.jsx";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { login: onLogin } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await login(email, password);
      onLogin(data.token, data.user);
      navigate("/dashboard");
    } catch (err) {
      setError("Invalid credentials");
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 py-10 text-slate-100 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -left-10 -top-24 w-72 h-72 bg-primary/25 blur-3xl rounded-full" />
        <div className="absolute right-0 top-20 w-80 h-80 bg-accent/20 blur-3xl rounded-full" />
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[900px] h-[900px] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04),transparent_55%)]" />
      </div>

      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center fade-in-up">
        <div className="glass-panel p-10 rounded-2xl shadow-2xl border border-white/5">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary bg-primary/10 px-3 py-1 rounded-full mb-4">Secure by design</div>
          <h1 className="text-3xl md:text-4xl font-semibold leading-tight mb-3">Welcome back to EscrowLancer</h1>
          <p className="text-slate-400 text-sm md:text-base mb-6">Sign in to manage projects, milestones, and on-chain releases with confidence.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="text-sm text-slate-300">Email</span>
              <input
                className="mt-2 w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/30 transition"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm text-slate-300">Password</span>
              <input
                className="mt-2 w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/30 transition"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              className="w-full bg-primary text-slate-950 font-semibold py-3 rounded-xl shadow-[0_15px_45px_-12px_rgba(6,182,212,0.6)] hover:translate-y-[-1px] transition-transform"
              type="submit"
            >
              Sign in
            </button>
            <p className="text-sm text-slate-400 text-center">No account? <Link className="text-primary hover:text-primary/80" to="/signup">Sign up</Link></p>
          </form>
        </div>

        <div className="hidden md:block relative">
          <div className="glass-panel rounded-2xl p-8 border border-white/5 shadow-2xl backdrop-blur-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-semibold">CE</div>
              <div>
                <p className="text-sm text-slate-300">Escrow in motion</p>
                <p className="text-lg font-semibold text-white">Live release timeline</p>
              </div>
            </div>
            <div className="space-y-3 text-sm text-slate-300">
              <div className="flex justify-between bg-white/5 border border-white/5 rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs uppercase text-slate-400">Project</p>
                  <p className="font-semibold">AI Product Launch</p>
                </div>
                <span className="text-primary font-semibold">+2.5 ETH</span>
              </div>
              <div className="flex justify-between bg-white/5 border border-white/5 rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs uppercase text-slate-400">Milestone</p>
                  <p className="font-semibold">Design Handoff</p>
                </div>
                <span className="text-emerald-400 font-semibold">Released</span>
              </div>
              <div className="flex justify-between bg-white/5 border border-white/5 rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs uppercase text-slate-400">Escrow balance</p>
                  <p className="font-semibold">8.0 ETH</p>
                </div>
                <span className="text-accent font-semibold">Live</span>
              </div>
            </div>
            <p className="mt-6 text-slate-400 text-sm">Multi-role access, audit trails, and instant status. Log in to pick up where you left off.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
