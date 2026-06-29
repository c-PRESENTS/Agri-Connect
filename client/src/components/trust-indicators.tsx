import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  Truck, 
  RefreshCw, 
  CreditCard, 
  Award,
  CheckCircle,
  ArrowRight,
  Leaf
} from "lucide-react";
import { SiFacebook, SiInstagram, SiX, SiLinkedin } from "react-icons/si";

const trustBadges = [
  {
    icon: Shield,
    title: "Secure Payments",
    description: "256-bit SSL encryption",
  },
  {
    icon: Truck,
    title: "Fast Delivery",
    description: "Same-day available",
  },
  {
    icon: RefreshCw,
    title: "Easy Returns",
    description: "30-day guarantee",
  },
  {
    icon: CreditCard,
    title: "Multiple Payments",
    description: "Cards, UPI, COD",
  },
];

const certifications = [
  "Soil Association Certified",
  "DEFRA Approved",
  "Red Tractor Assured",
  "LEAF Marque",
];

export function TrustIndicators() {
  return (
    <>
      <section className="py-5 sm:py-10 md:py-14 px-4 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {trustBadges.map((badge, index) => (
              <motion.div
                key={badge.title}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <motion.div
                  className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <badge.icon className="h-8 w-8 text-primary" />
                </motion.div>
                <h3 className="font-semibold mb-1">{badge.title}</h3>
                <p className="text-sm text-muted-foreground">{badge.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-6 sm:py-14 md:py-20 px-4 bg-gradient-to-br from-primary via-green-600 to-emerald-700 text-white">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 gap-8 sm:gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <span className="text-white/80 font-semibold text-xs sm:text-sm uppercase tracking-wider">
                Join Our Community
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mt-2 mb-4 sm:mb-6">
                Ready to Start
                <br />
                Your Journey?
              </h2>
              <p className="text-white/80 text-base sm:text-lg mb-6 sm:mb-8 max-w-md">
                Whether you're a farmer looking to sell or a customer seeking fresh produce, 
                AgriConnect is your trusted marketplace.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button 
                  size="lg" 
                  className="bg-white text-primary hover:bg-white/90 shadow-xl"
                  data-testid="button-become-seller"
                >
                  Become a Seller
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                  data-testid="button-download-app"
                >
                  Download App
                </Button>
              </div>
            </motion.div>
            
            <motion.div
              className="grid grid-cols-2 gap-4"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              {certifications.map((cert, index) => (
                <motion.div
                  key={cert}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex items-center gap-3 border border-white/20"
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <CheckCircle className="h-5 w-5 text-green-300 flex-shrink-0" />
                  <span className="text-sm font-medium">{cert}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      <footer className="py-5 sm:py-10 md:py-14 px-4 bg-card border-t">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-10 mb-8 sm:mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br from-primary to-green-600 flex items-center justify-center">
                  <Leaf className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <span className="font-bold text-lg sm:text-xl">AgriConnect</span>
              </div>
              <p className="text-muted-foreground text-xs sm:text-sm mb-3">
                Connecting farmers directly with customers for fresher produce and fairer prices.
              </p>
              <div className="flex gap-2">
                {[SiFacebook, SiX, SiInstagram, SiLinkedin].map((Icon, i) => (
                  <Button key={i} variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                    <Icon className="h-3.5 w-3.5" />
                  </Button>
                ))}
              </div>
            </div>
            
            {[
              {
                title: "Products",
                links: ["Fresh Vegetables", "Fruits", "Dairy & Eggs", "Meat & Poultry", "Organic Range"],
              },
              {
                title: "For Farmers",
                links: ["Sell Your Produce", "Photo-Sell AI", "Demand Alerts", "Government Schemes", "Training"],
              },
              {
                title: "Support",
                links: ["Help Centre", "Contact Us", "FAQs", "Delivery Info", "Returns Policy"],
              },
            ].map((section) => (
              <div key={section.title}>
                <h4 className="font-semibold mb-4">{section.title}</h4>
                <ul className="space-y-2">
                  {section.links.map((link) => (
                    <li key={link}>
                      <a 
                        href="#" 
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div className="pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} AgriConnect. All rights reserved. Made with love in the UK.
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <a href="/about" className="hover:text-primary transition-colors" data-testid="link-footer-about">About</a>
              <a href="/support" className="hover:text-primary transition-colors" data-testid="link-footer-support">Support</a>
              <a href="/farmers-help" className="hover:text-primary transition-colors" data-testid="link-footer-knowledge">Knowledge Hub</a>
              <a href="/about" className="hover:text-primary transition-colors" data-testid="link-footer-privacy">Privacy</a>
              <a href="/about" className="hover:text-primary transition-colors" data-testid="link-footer-terms">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
