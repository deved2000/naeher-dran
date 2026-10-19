// Android-App von „Näher dran“: eine schlanke Hülle, die die Web-App aus ../../web als Assets mitliefert.

plugins {
    id("com.android.application")
}

// Signierschlüssel kommt aus Umgebungsvariablen (lokal oder als GitHub-Secret), nie aus dem Repo.
val keystorePath: String? = System.getenv("NAEHERDRAN_KEYSTORE")
val keystorePassword: String? = System.getenv("NAEHERDRAN_KEYSTORE_PASSWORD")

android {
    namespace = "app.naeherdran"
    compileSdk = 35

    defaultConfig {
        applicationId = "app.naeherdran"
        minSdk = 24
        // Bewusst 34: ab 35 erzwingt Android 15 die Edge-to-Edge-Darstellung,
        // für die das Vollbild-Layout der Karten nicht ausgelegt ist.
        targetSdk = 34
        versionCode = 4
        versionName = "1.2"
    }

    signingConfigs {
        if (keystorePath != null) {
            create("release") {
                storeFile = file(keystorePath)
                storePassword = keystorePassword
                keyAlias = System.getenv("NAEHERDRAN_KEY_ALIAS") ?: "naeherdran"
                keyPassword = System.getenv("NAEHERDRAN_KEY_PASSWORD") ?: keystorePassword
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            // Ohne eigenen Schlüssel (z. B. in Forks) wird mit dem Debug-Schlüssel signiert,
            // damit die APK trotzdem installierbar ist.
            signingConfig = if (keystorePath != null) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }
        }
    }

    // Die Web-App ist die einzige Quelle für Oberfläche und Fragen.
    sourceSets {
        getByName("main") {
            assets.srcDirs("../../web")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    lint {
        // targetSdk 34 ist gewollt (siehe oben); die Play-Store-Warnung soll den Build nicht abbrechen.
        disable += "ExpiredTargetSdkVersion"
        abortOnError = false
        checkReleaseBuilds = false
    }
}
