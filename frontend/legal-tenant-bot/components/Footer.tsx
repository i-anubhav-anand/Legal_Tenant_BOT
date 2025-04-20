export default function Footer() {
  return (
    <footer className="border-t border-secondary-200 bg-white py-4 text-center text-xs text-secondary-500">
      <div className="mx-auto max-w-4xl px-4">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <a href="#" className="hover:text-primary-600">
            About
          </a>
          <span className="text-secondary-300">|</span>
          <a href="#" className="hover:text-primary-600">
            Privacy Policy
          </a>
          <span className="text-secondary-300">|</span>
          <a href="#" className="hover:text-primary-600">
            Terms
          </a>
          <span className="text-secondary-300">|</span>
          <a href="#" className="hover:text-primary-600">
            Contact
          </a>
        </div>

        <div className="mt-3">
          Join the LegalTenantBot community for more insights
          <a href="#" className="ml-1 font-medium text-primary-600 hover:underline">
            Join Discord
          </a>
        </div>
      </div>
    </footer>
  )
}
