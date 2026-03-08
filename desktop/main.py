import sys
from PyQt5.QtWidgets import QApplication
from ui.main_window import MainWindow

def main():
    # Enable High DPI scaling for modern displays
    QApplication.setAttribute(1, True) # AA_EnableHighDpiScaling
    QApplication.setAttribute(10, True) # AA_UseHighDpiPixmaps

    app = QApplication(sys.argv)
    app.setStyle("Fusion") # Consistent cross-platform look

    window = MainWindow()
    window.show()

    sys.exit(app.exec_())

if __name__ == "__main__":
    main()
