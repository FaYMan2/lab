from mathlab import generate_primes, is_palindrome, is_prime, nth_prime


if __name__ == "__main__":
    print("Primes from 10 to 50:", generate_primes(10, 50))
    print("5th prime:", nth_prime(5))
    print("Is 97 prime?", is_prime(97))
    print("Is 12321 a palindrome?", is_palindrome(12321))
    print("Is 'level' a palindrome?", is_palindrome("level"))
