"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Button } from "@/components/ui/Button";
import { profile } from "@/data/profile";
import { GithubIcon, LinkedinIcon, TwitterIcon, MailIcon, MapPinIcon, SendIcon, MessageSquareIcon, Loader2Icon } from "@/components/ui/SocialIcons";
import { cn } from "@/lib/utils";

export function Contact() {
  const [formState, setFormState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState("submitting");

    await new Promise((resolve) => setTimeout(resolve, 1500));

    setFormState("success");
    setFormData({ name: "", email: "", subject: "", message: "" });

    setTimeout(() => setFormState("idle"), 5000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const contactMethods = [
    {
      Icon: MailIcon,
      title: "Email",
      value: profile.email,
      href: `mailto:${profile.email}`,
      description: "Fastest. I read everything.",
    },
    {
      Icon: GithubIcon,
      title: "GitHub",
      value: "@AryaVora621",
      href: "https://github.com/AryaVora621",
      description: "41 public repos and counting.",
    },
    {
      Icon: LinkedinIcon,
      title: "LinkedIn",
      value: "Arya Vora",
      href: profile.linkedin,
      description: "For the professional paper trail.",
    },
    {
      Icon: TwitterIcon,
      title: "Twitter/X",
      value: "@aryavora621",
      href: profile.twitter,
      description: "Build logs and robot opinions.",
    },
    {
      Icon: MapPinIcon,
      title: "Location",
      value: "Edison, NJ",
      href: "#",
      description: "JP Stevens HS area. Happy to meet IRL.",
    },
  ];

  const inputClass =
    "w-full px-4 py-3 rounded-[3px] bg-ink-950 border border-ink-700 text-paper-50 placeholder:text-paper-600 focus:outline-none focus:border-signal-500 transition-colors";

  return (
    <section id="contact" className="relative pt-28 pb-20 px-6 overflow-hidden" data-glow="on">
      <div className="relative z-10 max-w-6xl mx-auto">
        <ScrollReveal direction="up">
          <div className="mb-14">
            <p className="kicker mb-5">04 / Contact</p>
            <h2 className="font-display font-medium tracking-[-0.02em] leading-[1.02] text-4xl md:text-5xl lg:text-6xl text-paper-50 max-w-3xl text-balance">
              Email me. <em className="italic font-light text-signal-400">I reply.</em>
            </h2>
            <p className="text-base md:text-lg text-paper-400 max-w-2xl mt-6 leading-relaxed">
              Mentorship, collaboration, a bug you spotted on this site, or a
              team that wants to talk autonomous — within a couple of days,
              usually faster.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={150} direction="up">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div>
              <div className="border-t border-ink-700">
                {contactMethods.map((method, index) => (
                  <motion.div
                    key={method.title}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ delay: index * 0.06, duration: 0.4 }}
                  >
                    <a
                      href={method.href}
                      target={method.href.startsWith("http") ? "_blank" : undefined}
                      rel={method.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="flex items-center gap-4 py-4 border-b border-ink-700 group"
                      aria-label={`${method.title}: ${method.value}`}
                    >
                      <span className="w-10 h-10 border border-ink-700 bg-ink-900 rounded-[3px] flex items-center justify-center flex-shrink-0 text-paper-400 group-hover:text-signal-300 group-hover:border-signal-500/50 transition-colors">
                        <method.Icon className="w-5 h-5" aria-label={method.title} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-mono text-sm text-paper-50">{method.title}</span>
                        <span className="block text-sm text-paper-500 truncate">{method.value} — {method.description}</span>
                      </span>
                      <SendIcon className="w-4 h-4 text-paper-600 group-hover:text-signal-300 group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </a>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="panel p-6 md:p-8">
              <h3 className="font-display text-2xl text-paper-50">Send a message</h3>
              <p className="font-mono text-[11px] text-paper-500 mt-1 mb-6 uppercase tracking-[0.14em]">
                Goes straight to my inbox
              </p>

              {formState === "success" ? (
                <div className="border border-signal-500/50 bg-signal-500/5 rounded-[3px] p-6">
                  <p className="font-display text-xl text-paper-50 mb-1">Message sent.</p>
                  <p className="text-sm text-paper-400">I&apos;ll get back to you within a couple of days.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="block font-mono text-[11px] uppercase tracking-[0.14em] text-paper-500 mb-1.5">
                        Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className={inputClass}
                        placeholder="Your name"
                        disabled={formState === "submitting"}
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block font-mono text-[11px] uppercase tracking-[0.14em] text-paper-500 mb-1.5">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className={inputClass}
                        placeholder="you@example.com"
                        disabled={formState === "submitting"}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block font-mono text-[11px] uppercase tracking-[0.14em] text-paper-500 mb-1.5">
                      Subject
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      className={inputClass}
                      placeholder="What&apos;s this about?"
                      disabled={formState === "submitting"}
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block font-mono text-[11px] uppercase tracking-[0.14em] text-paper-500 mb-1.5">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={5}
                      className={cn(inputClass, "resize-none")}
                      placeholder="Say hello, pitch an idea, report a bug…"
                      disabled={formState === "submitting"}
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="gradient"
                    size="lg"
                    className="w-full"
                    loading={formState === "submitting"}
                    icon={formState === "submitting" ? <Loader2Icon size={18} /> : <MessageSquareIcon size={18} />}
                    iconPosition="right"
                  >
                    {formState === "submitting" ? "Sending…" : "Send message"}
                  </Button>

                  <p className="font-mono text-[11px] text-paper-600 text-center">
                    No newsletter. No spam. Just a reply.
                  </p>
                </form>
              )}
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={150} direction="up">
          <div className="mt-16 pt-8 border-t border-ink-700">
            <p className="kicker mb-4">Currently open to</p>
            <div className="flex flex-wrap gap-2">
              {["Robotics internships", "AI research", "Open source", "Mentoring", "Hackathons"].map((item) => (
                <span key={item} className="px-3 py-1.5 font-mono text-xs text-paper-200 border border-ink-700 bg-ink-900">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
