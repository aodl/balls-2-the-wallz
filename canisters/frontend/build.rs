fn main() {
    println!("cargo::rerun-if-changed=public");
    println!("cargo::rerun-if-changed=policy.rs");
}
