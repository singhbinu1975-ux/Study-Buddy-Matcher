import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 font-sans">
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-500/10 blur-[120px] pointer-events-none" />

      <div className="relative z-10">
        <SignIn
          appearance={{
            elements: {
              card: "bg-slate-900 border border-white/5 shadow-2xl",
              headerTitle: "text-white font-extrabold",
              headerSubtitle: "text-slate-400",
              socialButtonsBlockButton: "bg-slate-800 border border-white/10 hover:bg-slate-700 text-white",
              socialButtonsBlockButtonText: "text-white font-medium",
              formFieldLabel: "text-slate-300",
              formFieldInput: "bg-slate-800 border border-white/10 text-white focus:border-indigo-500 focus:ring-indigo-500",
              formButtonPrimary: "bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors",
              footerActionText: "text-slate-400",
              footerActionLink: "text-indigo-400 hover:text-indigo-300 transition-colors",
              dividerLine: "bg-white/10",
              dividerText: "text-slate-500",
              identityPreviewText: "text-slate-300",
              identityPreviewEditButton: "text-indigo-400 hover:text-indigo-300",
              formFieldSuccessText: "text-emerald-400",
              formFieldErrorText: "text-rose-400",
            },
          }}
        />
      </div>
    </div>
  );
}
