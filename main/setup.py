
from setuptools import setup, find_packages

setup(
    name="realis",
    version="0.1.0",
    description="REALIS Physics Engine - Python Implementation",
    author="REALIS Team",
    package_dir={'': 'pythonDev'},
    packages=find_packages(where='pythonDev'),
    python_requires='>=3.7',
    install_requires=[
        "numpy",
        "scipy",
        # "flask", # if web is used
        # "moderngl", # if using advanced gl
        # "glfw",
        # "PyOpenGL",
    ],
)
