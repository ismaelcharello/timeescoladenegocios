import UIKit
import Capacitor
import WebKit

@objc(MobilePolicyPlugin)
final class MobilePolicyPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "MobilePolicyPlugin"
    let jsName = "MobilePolicy"
    let pluginMethods: [CAPPluginMethod] = []

    @objc override func shouldOverrideLoad(_ navigationAction: WKNavigationAction) -> NSNumber? {
        guard let url = navigationAction.request.url,
              url.host?.caseInsensitiveCompare("app.timeescoladenegocios.com.br") == .orderedSame else {
            return nil
        }

        if url.path == "/checkout" || url.path.hasPrefix("/checkout/") {
            DispatchQueue.main.async { [weak self] in
                self?.bridge?.showAlertWith(
                    title: "Assinatura pelo app",
                    message: "A compra mobile será liberada após a definição de pagamento das lojas. Membros ativos podem continuar entrando normalmente.",
                    buttonTitle: "Entendi"
                )
            }
            return true
        }

        return nil
    }
}

final class MobileBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(MobilePolicyPlugin())
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    private var mobileController: MobileBridgeViewController? {
        window?.rootViewController as? MobileBridgeViewController
    }

    private func productionURL(from incomingURL: URL) -> URL? {
        if incomingURL.scheme == "https",
           incomingURL.host?.caseInsensitiveCompare("app.timeescoladenegocios.com.br") == .orderedSame {
            return incomingURL
        }

        guard incomingURL.scheme == "timeescola", incomingURL.host == "auth" else {
            return nil
        }

        var components = URLComponents()
        components.scheme = "https"
        components.host = "app.timeescoladenegocios.com.br"
        components.path = incomingURL.path.isEmpty ? "/auth/confirm" : "/auth\(incomingURL.path)"
        components.query = incomingURL.query
        components.fragment = incomingURL.fragment
        return components.url
    }

    private func openInApp(_ incomingURL: URL) {
        guard let url = productionURL(from: incomingURL) else { return }
        mobileController?.webView?.load(URLRequest(url: url))
    }

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = MobileBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)

        if let incomingURL = connectionOptions.urlContexts.first?.url {
            DispatchQueue.main.async { [weak self] in self?.openInApp(incomingURL) }
        } else if let incomingURL = connectionOptions.userActivities.first?.webpageURL {
            DispatchQueue.main.async { [weak self] in self?.openInApp(incomingURL) }
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
        if let incomingURL = URLContexts.first?.url {
            openInApp(incomingURL)
        }
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
        if let incomingURL = userActivity.webpageURL {
            openInApp(incomingURL)
        }
    }
}
