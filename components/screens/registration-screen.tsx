"use client";

import { useState } from "react";
import {
  Camera,
  ChevronRight,
  User,
  Check,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface RegistrationScreenProps {
  onNavigate: (screen: string) => void;
}

const steps = ["Profile", "Stats", "Confirm"];

const roles = ["Batsman", "Bowler", "All-Rounder", "Wicket-Keeper"];
const handedness = ["Right", "Left"];

export function RegistrationScreen({ onNavigate }: RegistrationScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    batting: "Right",
    bowling: "Right",
    basePoints: 100,
  });

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    } else {
      onNavigate("landing");
    }
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="px-5 pt-10 pb-4">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-1 text-muted-foreground text-sm mb-4 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-foreground">
          Player Registration
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set up your profile and get auction-ready
        </p>
      </header>

      {/* Progress Bar */}
      <div className="px-5 mb-6">
        <div className="flex items-center gap-2">
          {steps.map((step, i) => (
            <div key={step} className="flex-1 flex items-center gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                      i < currentStep
                        ? "bg-neon text-background"
                        : i === currentStep
                          ? "bg-gold text-background"
                          : "bg-secondary text-muted-foreground"
                    )}
                  >
                    {i < currentStep ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      i <= currentStep
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {step}
                  </span>
                </div>
                <div className="h-1 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      i < currentStep
                        ? "w-full bg-neon"
                        : i === currentStep
                          ? "w-1/2 bg-gold"
                          : "w-0"
                    )}
                  />
                </div>
              </div>
              {i < steps.length - 1 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0 mt-3" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="px-5">
        {currentStep === 0 && (
          <div className="flex flex-col gap-5 animate-slide-in-right">
            {/* Avatar Upload */}
            <div className="flex justify-center">
              <button
                type="button"
                className="relative h-24 w-24 rounded-full bg-secondary flex items-center justify-center border-2 border-dashed border-border hover:border-gold/50 transition-colors"
              >
                <User className="h-10 w-10 text-muted-foreground" />
                <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-gold flex items-center justify-center">
                  <Camera className="h-4 w-4 text-background" />
                </div>
              </button>
            </div>

            {/* Form Fields */}
            <div className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor="name"
                  className="text-xs font-medium text-muted-foreground mb-1.5 block"
                >
                  Full Name
                </label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter your name"
                  className="bg-secondary border-border/50 text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-gold/20"
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="text-xs font-medium text-muted-foreground mb-1.5 block"
                >
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="your@email.com"
                  className="bg-secondary border-border/50 text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-gold/20"
                />
              </div>
              <div>
                <label
                  htmlFor="phone"
                  className="text-xs font-medium text-muted-foreground mb-1.5 block"
                >
                  Phone
                </label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+1 (000) 000-0000"
                  className="bg-secondary border-border/50 text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-gold/20"
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="flex flex-col gap-5 animate-slide-in-right">
            {/* Player Role */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Playing Role
              </label>
              <div className="grid grid-cols-2 gap-2">
                {roles.map((r) => (
                  <button
                    type="button"
                    key={r}
                    onClick={() => setFormData({ ...formData, role: r })}
                    className={cn(
                      "glass rounded-xl p-3 text-sm font-medium transition-all",
                      formData.role === r
                        ? "border-gold bg-gold/10 text-gold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Handedness */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Batting Hand
              </label>
              <div className="flex gap-2">
                {handedness.map((h) => (
                  <button
                    type="button"
                    key={h}
                    onClick={() => setFormData({ ...formData, batting: h })}
                    className={cn(
                      "flex-1 glass rounded-xl p-3 text-sm font-medium transition-all",
                      formData.batting === h
                        ? "border-gold bg-gold/10 text-gold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {h} Hand
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Bowling Hand
              </label>
              <div className="flex gap-2">
                {handedness.map((h) => (
                  <button
                    type="button"
                    key={h}
                    onClick={() => setFormData({ ...formData, bowling: h })}
                    className={cn(
                      "flex-1 glass rounded-xl p-3 text-sm font-medium transition-all",
                      formData.bowling === h
                        ? "border-gold bg-gold/10 text-gold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {h} Hand
                  </button>
                ))}
              </div>
            </div>

            {/* Base Points */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Base Points: {formData.basePoints}
              </label>
              <input
                type="range"
                min={50}
                max={500}
                step={10}
                value={formData.basePoints}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    basePoints: Number(e.target.value),
                  })
                }
                className="w-full accent-gold"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>50 pts</span>
                <span>500 pts</span>
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="flex flex-col gap-4 animate-slide-in-right">
            <div className="glass rounded-xl p-5">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center">
                  <User className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    {formData.name || "Your Name"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {formData.email || "your@email.com"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Role", value: formData.role || "Not set" },
                  { label: "Batting", value: `${formData.batting} Hand` },
                  { label: "Bowling", value: `${formData.bowling} Hand` },
                  { label: "Base Points", value: `${formData.basePoints} pts` },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="bg-secondary/60 rounded-lg p-3"
                  >
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      {item.label}
                    </span>
                    <p className="text-sm font-semibold text-foreground mt-0.5">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-6">
          {currentStep < steps.length - 1 ? (
            <Button
              size="lg"
              onClick={handleNext}
              className="w-full bg-gold text-background hover:bg-gold/90 font-semibold"
            >
              Continue
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={() => onNavigate("interest")}
              className="w-full bg-neon text-background hover:bg-neon/90 font-semibold"
            >
              <Check className="h-4 w-4 mr-1" />
              Confirm Registration
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
