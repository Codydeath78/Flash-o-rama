import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs"
import { ThemeProvider} from "@/app/toggle_theme/theme-context.js"; // Adjust the path if needed
const inter = Inter({ subsets: ["latin"] });
export const metadata = {
  title: "Flash-o-rama",
  description: "Best way to study your courses today!",
}

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
       <ThemeProvider>
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
    </ThemeProvider>
    </ClerkProvider>
  )
}
